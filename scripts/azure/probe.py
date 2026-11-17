#!/usr/bin/env python3
"""Probe guest requests to /api/premium-tts across Front Door and APIM gateway.

Usage:
  python3 scripts/azure/probe.py MODE FRONT_DOOR_URL GATEWAY_URL FRONT_DOOR_ID [--out FILE]
    [--from-staging-app] [--calls N] [--window SECONDS]
"""

from __future__ import annotations

import argparse
import base64
from datetime import datetime, timezone
import hashlib
import http.client
import json
import os
from pathlib import Path
import re
import shlex
import ssl
import subprocess
import sys
import tempfile
import time
from typing import Any, Callable, Dict, List, Optional, Sequence, Tuple, Union
import urllib.parse

PREMIUM_TTS_ROUTE = "/api/premium-tts"
EXPECTED_AUDIO_FORMAT = "audio-24khz-48kbitrate-mono-mp3"
EXPECTED_CONTENT_TYPE = "audio/mpeg"
RULE_AUDIO_SOURCE = "audio-source"
RULE_AUDIO_RATE = "audio-rate"

CLASSIFICATION_VALID_AUDIO = "valid_audio"
CLASSIFICATION_ACCESS_REFUSAL = "access_refusal"
CLASSIFICATION_RATE_LIMIT = "rate_limit"
CLASSIFICATION_UNEXPECTED_FAILURE = "unexpected_failure"

VALID_MODES = ("inspect", "prove", "burst", "usable", "limited", "final", "aba")
DEFAULT_TEXT = "hello"
DEFAULT_ALTERED_IP = "203.0.113.195"
DEFAULT_REPEATED_IPS = ("198.51.100.10", "198.51.100.20")
ADDRESS_HEADER_NAMES = (
    "X-Forwarded-For",
    "X-Real-IP",
    "X-Client-IP",
    "X-Azure-ClientIP",
    "X-Azure-SocketIP",
    "True-Client-IP",
    "Forwarded",
)

MPEG_VERSIONS = {0b00: "MPEG-2.5", 0b01: None, 0b10: "MPEG-2", 0b11: "MPEG-1"}
MPEG_LAYERS = {0b00: None, 0b01: "Layer III", 0b10: "Layer II", 0b11: "Layer I"}
SAMPLE_RATES_HZ = {
    "MPEG-1": (44100, 48000, 32000, None),
    "MPEG-2": (22050, 24000, 16000, None),
    "MPEG-2.5": (11025, 12000, 8000, None),
}
BITRATES_KBPS = {
    "MPEG-1": (None, 32, 40, 48, 56, 64, 80, 96, 112, 128, 160, 192, 224, 256, 320, None),
    "MPEG-2": (None, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, None),
    "MPEG-2.5": (None, 8, 16, 24, 32, 40, 48, 56, 64, 80, 96, 112, 128, 144, 160, None),
}
CHANNEL_MODES = {0b00: "stereo", 0b01: "joint_stereo", 0b10: "dual_channel", 0b11: "mono"}


def normalize_target_endpoint(base_url: str) -> str:
    cleaned = base_url.strip().rstrip("/")
    if not cleaned:
        raise ValueError("Target URL cannot be empty.")
    if not cleaned.startswith(("http://", "https://")):
        cleaned = f"https://{cleaned}"
    if cleaned.endswith(PREMIUM_TTS_ROUTE):
        return cleaned
    if cleaned.endswith("/api"):
        return f"{cleaned}/premium-tts"
    return f"{cleaned}{PREMIUM_TTS_ROUTE}"


def build_canonical_get_query(text: str = DEFAULT_TEXT) -> str:
    return urllib.parse.urlencode([("text", text), ("format", "audio")])


def build_request_headers(
    header_mode: str = "normal",
    altered_ip: str = DEFAULT_ALTERED_IP,
    extra_headers: Optional[Dict[str, str]] = None,
) -> List[Tuple[str, str]]:
    pairs: List[Tuple[str, str]] = [
        ("Accept", "audio/mpeg, application/json;q=0.9, */*;q=0.8"),
        ("User-Agent", "pte-audio-probe/1.0"),
    ]
    if header_mode == "altered":
        for name in ADDRESS_HEADER_NAMES:
            val = f'for="{altered_ip}";proto=https' if name.lower() == "forwarded" else altered_ip
            pairs.append((name, val))
    elif header_mode == "repeated-header":
        for ip_val in DEFAULT_REPEATED_IPS:
            pairs.append(("X-Forwarded-For", ip_val))
        pairs.append(("X-Real-IP", DEFAULT_REPEATED_IPS[0]))
        pairs.append(("X-Client-IP", DEFAULT_REPEATED_IPS[0]))
    if extra_headers:
        pairs.extend((k, v) for k, v in extra_headers.items())
    return pairs


def _parse_mpeg_frame(hdr: bytes) -> Optional[Dict[str, Any]]:
    if len(hdr) < 4 or hdr[0] != 0xFF or (hdr[1] & 0xE0) != 0xE0:
        return None
    ver = MPEG_VERSIONS.get((hdr[1] >> 3) & 0x03)
    layer = MPEG_LAYERS.get((hdr[1] >> 1) & 0x03)
    if ver is None or layer != "Layer III":
        return None
    sr = SAMPLE_RATES_HZ[ver][(hdr[2] >> 2) & 0x03]
    br = BITRATES_KBPS[ver][(hdr[2] >> 4) & 0x0F]
    if sr is None or br is None:
        return None
    pad = (hdr[2] >> 1) & 0x01
    flen = int(((144 if ver == "MPEG-1" else 72) * (br * 1000)) // sr) + pad
    return {
        "mpeg_version": ver,
        "layer": layer,
        "sample_rate_hz": sr,
        "bitrate_kbps": br,
        "channel_mode": CHANNEL_MODES[(hdr[3] >> 6) & 0x03],
        "frame_length": flen,
    }


def validate_mp3_audio(body: bytes, content_type: Optional[str]) -> Dict[str, Any]:
    ct = (content_type or "").split(";", 1)[0].strip().lower()
    if ct != EXPECTED_CONTENT_TYPE:
        return {"valid": False, "reason": f"unexpected content-type '{ct or 'none'}'", "bytes": len(body)}
    if not body or len(body) < 4:
        return {"valid": False, "reason": "empty or truncated MP3 payload", "bytes": len(body)}

    offset = 0
    if len(body) >= 10 and body[:3] == b"ID3":
        size = ((body[6] & 0x7F) << 21) | ((body[7] & 0x7F) << 14) | ((body[8] & 0x7F) << 7) | (body[9] & 0x7F)
        offset = 10 + size + (10 if (body[5] & 0x10) else 0)
    if offset >= len(body):
        return {"valid": False, "reason": "truncated MP3 after ID3v2 tag", "bytes": len(body)}

    first = _parse_mpeg_frame(body[offset : offset + 4])
    if first is None:
        return {"valid": False, "reason": "missing MPEG Layer III frame sync", "bytes": len(body)}

    end = len(body) - (128 if len(body) - offset >= 128 and body[-128:-125] == b"TAG" else 0)
    frames, cur = 0, offset
    while cur < end:
        if cur + 4 > end:
            return {"valid": False, "reason": "truncated MP3 frame header", "frame_count": frames, "bytes": len(body)}
        fr = _parse_mpeg_frame(body[cur : cur + 4])
        if fr is None or cur + fr["frame_length"] > end:
            return {"valid": False, "reason": "truncated or unaligned MP3 frame", "frame_count": frames, "bytes": len(body)}
        frames += 1
        cur += fr["frame_length"]

    if frames < 2:
        return {"valid": False, "reason": f"truncated MP3: only {frames} frame(s)", "frame_count": frames, "bytes": len(body)}
    if (
        first["mpeg_version"] != "MPEG-2"
        or first["sample_rate_hz"] != 24000
        or first["bitrate_kbps"] != 48
        or first["channel_mode"] != "mono"
    ):
        return {"valid": False, "reason": "MP3 format mismatch", "frame_count": frames, "bytes": len(body)}

    return {
        "valid": True,
        "format": EXPECTED_AUDIO_FORMAT,
        "content_type": ct,
        "mpeg_version": first["mpeg_version"],
        "layer": first["layer"],
        "sample_rate_hz": first["sample_rate_hz"],
        "bitrate_kbps": first["bitrate_kbps"],
        "channel_mode": first["channel_mode"],
        "frame_count": frames,
        "bytes": len(body),
    }


def extract_debug_headers(headers: Dict[str, str]) -> Dict[str, str]:
    return {k.lower(): v for k, v in headers.items() if k.lower().startswith("x-audio-debug-")}


def extract_rule_name(headers: Dict[str, str], body: bytes) -> Optional[str]:
    lh = {k.lower(): v.strip() for k, v in headers.items()}
    for k in ("x-audio-debug-rule", "x-audio-rule", "x-rule", "x-policy-rule", "x-refusal-rule"):
        if lh.get(k):
            return lh[k]
    text = body.decode("utf-8", errors="replace").strip()
    if text.startswith("{"):
        try:
            doc = json.loads(text)
            if isinstance(doc, dict):
                for k in ("rule", "policyRule", "code", "reason"):
                    if isinstance(doc.get(k), str) and doc[k].strip():
                        return doc[k].strip()
        except Exception:
            pass
    for r in (RULE_AUDIO_SOURCE, RULE_AUDIO_RATE):
        if re.search(rf"\b{re.escape(r)}\b", text, flags=re.IGNORECASE):
            return r
    return None


def classify_response(
    status: int,
    headers: Dict[str, str],
    body: bytes,
    error_message: Optional[str] = None,
    require_rule: Optional[str] = None,
) -> Tuple[str, str, Optional[Dict[str, Any]], Optional[str]]:
    lh = {k.lower(): v for k, v in headers.items()}
    ct = lh.get("content-type", "")
    text = body.decode("utf-8", errors="replace").strip()
    rule = extract_rule_name(lh, body)

    if status == 0 or error_message:
        return CLASSIFICATION_UNEXPECTED_FAILURE, f"transport_error: {error_message or 'failed'}", None, rule

    if status == 429:
        if require_rule and rule != require_rule:
            return CLASSIFICATION_UNEXPECTED_FAILURE, f"wrong_rate_limit_rule: {rule or 'none'}", None, rule
        if rule and rule not in (RULE_AUDIO_RATE, require_rule):
            return CLASSIFICATION_UNEXPECTED_FAILURE, f"unexpected_rule_on_429: {rule}", None, rule
        return CLASSIFICATION_RATE_LIMIT, text[:160] or "HTTP 429 Too Many Requests", None, rule

    if status in (401, 403, 407):
        if status == 403 and (rule == RULE_AUDIO_RATE or "quota" in text.lower() or "rate limit" in text.lower()):
            if require_rule and require_rule != RULE_AUDIO_RATE:
                return CLASSIFICATION_UNEXPECTED_FAILURE, f"wrong_refusal_rule: {rule or RULE_AUDIO_RATE}", None, rule
            return CLASSIFICATION_RATE_LIMIT, text[:160] or "HTTP 403 Quota Exceeded", None, rule or RULE_AUDIO_RATE
        if require_rule and rule != require_rule:
            return CLASSIFICATION_UNEXPECTED_FAILURE, f"wrong_refusal_rule: expected {require_rule}, got {rule or 'generic_403'}", None, rule
        if rule and rule != RULE_AUDIO_SOURCE:
            return CLASSIFICATION_UNEXPECTED_FAILURE, f"wrong_refusal_rule: {rule}", None, rule
        return CLASSIFICATION_ACCESS_REFUSAL, text[:160] or f"HTTP {status} Access Refused", None, rule

    if status == 200:
        if "application/json" in ct.lower() or text.startswith("{"):
            try:
                doc = json.loads(text)
            except Exception:
                doc = None
            if isinstance(doc, dict):
                if doc.get("fallback") is True or doc.get("success") is False:
                    return CLASSIFICATION_UNEXPECTED_FAILURE, f"synthesis_fallback: {doc.get('error', 'fallback')}", None, rule
                data = doc.get("data")
                if isinstance(data, dict) and isinstance(data.get("audioBase64"), str):
                    try:
                        raw_mp3 = base64.b64decode(data["audioBase64"], validate=True)
                    except Exception as exc:
                        return CLASSIFICATION_UNEXPECTED_FAILURE, f"invalid_base64_audio: {exc}", None, rule
                    chk = validate_mp3_audio(raw_mp3, str(data.get("contentType") or EXPECTED_CONTENT_TYPE))
                    if chk.get("valid"):
                        return CLASSIFICATION_VALID_AUDIO, "ok", chk, rule
                    return CLASSIFICATION_UNEXPECTED_FAILURE, f"invalid_audio_format: {chk.get('reason')}", chk, rule

        chk = validate_mp3_audio(body, ct)
        if chk.get("valid"):
            return CLASSIFICATION_VALID_AUDIO, "ok", chk, rule
        return CLASSIFICATION_UNEXPECTED_FAILURE, f"invalid_audio_format: {chk.get('reason')}", chk, rule

    return CLASSIFICATION_UNEXPECTED_FAILURE, f"HTTP {status}: {text[:160]}", None, rule


def send_local_request(
    url: str,
    method: str,
    headers: Sequence[Tuple[str, str]],
    body: Optional[bytes] = None,
    timeout_seconds: float = 15.0,
) -> Tuple[int, Dict[str, str], bytes, Optional[str]]:
    parsed = urllib.parse.urlsplit(url)
    scheme = (parsed.scheme or "https").lower()
    host = parsed.hostname
    if not host:
        return 0, {}, b"", f"invalid URL '{url}'"
    port = parsed.port or (443 if scheme == "https" else 80)
    target = (parsed.path or "/") + (f"?{parsed.query}" if parsed.query else "")
    try:
        conn = (
            http.client.HTTPSConnection(host, port, timeout=timeout_seconds, context=ssl.create_default_context())
            if scheme == "https"
            else http.client.HTTPConnection(host, port, timeout=timeout_seconds)
        )
        try:
            conn.putrequest(method.upper(), target)
            for k, v in headers:
                conn.putheader(k, v)
            if body is not None and not any(k.lower() == "content-length" for k, _ in headers):
                conn.putheader("Content-Length", str(len(body)))
            conn.endheaders(body)
            resp = conn.getresponse()
            rh: Dict[str, str] = {}
            for k, v in resp.getheaders():
                kl = k.lower()
                rh[kl] = f"{rh[kl]}, {v}" if kl in rh else v
            return int(resp.status), rh, resp.read(), None
        finally:
            conn.close()
    except Exception as exc:
        return 0, {}, b"", str(exc)


def verify_and_resolve_staging_app(env: Dict[str, str], az_bin: str = "az") -> Dict[str, Any]:
    web_app_id = env.get("WEB_APP_ID", "")
    sub_id = env.get("AZURE_SUBSCRIPTION_ID", "")
    rg = env.get("AZURE_RESOURCE_GROUP") or env.get("AZURE_RESOURCE_GROUP_NAME") or "ccl-pronunciation-trainer-rg"
    app_name = env.get("WEB_APP_NAME") or env.get("APP_SERVICE_NAME") or ""

    if web_app_id.startswith("/subscriptions/"):
        m = re.match(r"^/subscriptions/([^/]+)/resourceGroups/([^/]+)/providers/Microsoft\.Web/sites/([^/]+)", web_app_id, re.I)
        if m:
            sub_id, rg, app_name = sub_id or m.group(1), m.group(2), m.group(3)
        arm_url = f"https://management.azure.com{web_app_id}?api-version=2023-12-01"
    else:
        if not sub_id and env.get("APIM_ID", "").startswith("/subscriptions/"):
            m = re.match(r"^/subscriptions/([^/]+)/resourceGroups/([^/]+)/", env["APIM_ID"], re.I)
            if m:
                sub_id, rg = m.group(1), m.group(2)
        if not sub_id or not app_name:
            raise RuntimeError("Staging app unresolved: set WEB_APP_ID or WEB_APP_NAME and AZURE_SUBSCRIPTION_ID.")
        arm_url = f"https://management.azure.com/subscriptions/{sub_id}/resourceGroups/{rg}/providers/Microsoft.Web/sites/{app_name}?api-version=2023-12-01"

    proc = subprocess.run(
        [az_bin, "rest", "--method", "get", "--url", arm_url, "--only-show-errors", "--output", "json"],
        capture_output=True,
        text=True,
        timeout=20,
        check=False,
    )
    if proc.returncode != 0:
        raise RuntimeError(f"Staging app verification failed: {(proc.stderr or proc.stdout).strip()}")
    doc = json.loads(proc.stdout or "{}")
    tags = doc.get("tags") if isinstance(doc, dict) else None
    stage = tags.get("deploymentStage") if isinstance(tags, dict) else None
    if stage != "staging":
        raise RuntimeError(f"Staging app verification failed: Refusing staging app '{app_name}': expected tag 'deploymentStage=staging', found '{stage}'.")
    state = (doc.get("properties") or {}).get("state", "Running")
    if str(state).lower() != "running":
        raise RuntimeError(f"Staging app '{app_name}' state is '{state}', expected 'Running'.")
    return {"name": str(doc.get("name") or app_name), "resource_group": rg, "subscription_id": sub_id, "state": state, "deploymentStage": stage}


def send_staging_app_request(
    url: str,
    method: str,
    headers: Sequence[Tuple[str, str]],
    body: Optional[bytes],
    app_info: Dict[str, Any],
    az_bin: str = "az",
    app_runner_cmd: Optional[str] = None,
) -> Tuple[int, Dict[str, str], bytes, Optional[str]]:
    payload = json.dumps({
        "url": url,
        "method": method.upper(),
        "headers": [[k, v] for k, v in headers],
        "bodyBase64": base64.b64encode(body).decode("ascii") if body is not None else None,
        "timeoutMs": 15000,
    })
    node_js = (
        "const http=require('node:http'),https=require('node:https'),{URL}=require('node:url');"
        "const c=JSON.parse(process.argv[1]),u=new URL(c.url),m=u.protocol==='https:'?https:http;"
        "const r=m.request({protocol:u.protocol,hostname:u.hostname,port:u.port||(u.protocol==='https:'?443:80),"
        "path:u.pathname+u.search,method:c.method,timeout:c.timeoutMs},res=>{const ch=[];res.on('data',d=>ch.push(d));"
        "res.on('end',()=>{const h={};for(const[k,v]of Object.entries(res.headers))if(v!==undefined)h[k.toLowerCase()]=Array.isArray(v)?v.join(', '):String(v);"
        "process.stdout.write(JSON.stringify({status:res.statusCode||0,headers:h,bodyBase64:Buffer.concat(ch).toString('base64')}));});});"
        "r.on('error',e=>process.stdout.write(JSON.stringify({status:0,headers:{},bodyBase64:'',error:String(e.message||e)})));"
        "for(const[k,v]of c.headers)r.setHeader(k,v);"
        "if(c.bodyBase64)r.write(Buffer.from(c.bodyBase64,'base64'));r.end();"
    )
    if app_runner_cmd:
        proc = subprocess.run(shlex.split(app_runner_cmd) + [payload], capture_output=True, text=True, timeout=25, check=False)
        if proc.returncode != 0:
            return 0, {}, b"", (proc.stderr or proc.stdout).strip()
        raw_out = proc.stdout.strip()
    else:
        kudu_url = f"https://{app_info['name']}.scm.azurewebsites.net/api/command"
        kudu_body = json.dumps({"command": f"node -e {shlex.quote(node_js)} {shlex.quote(payload)}", "dir": "/tmp"})
        proc = subprocess.run(
            [az_bin, "rest", "--method", "post", "--url", kudu_url, "--resource", "https://management.azure.com/",
             "--headers", "Content-Type=application/json", "--body", kudu_body, "--only-show-errors", "--output", "json"],
            capture_output=True,
            text=True,
            timeout=30,
            check=False,
        )
        if proc.returncode != 0:
            return 0, {}, b"", (proc.stderr or proc.stdout).strip()
        kudu = json.loads(proc.stdout or "{}")
        if kudu.get("ExitCode", 0) != 0 or not (kudu.get("Output") or "").strip():
            return 0, {}, b"", (kudu.get("Error") or kudu.get("Output") or "remote command failed").strip()
        raw_out = kudu["Output"].strip()

    env_json = json.loads(raw_out.splitlines()[-1])
    rh = {str(k).lower(): str(v) for k, v in (env_json.get("headers") or {}).items()}
    b64 = env_json.get("bodyBase64") or ""
    return int(env_json.get("status") or 0), rh, (base64.b64decode(b64) if b64 else b""), env_json.get("error")


def _build_record(
    case_name: str,
    target: str,
    connection: str,
    method: str,
    url: str,
    status: int,
    resp_headers: Dict[str, str],
    body: bytes,
    err: Optional[str],
    require_rule: Optional[str] = None,
) -> Dict[str, Any]:
    cls, detail, audio_info, rule = classify_response(status, resp_headers, body, err, require_rule=require_rule)
    debug = extract_debug_headers(resp_headers)
    counter_key = (
        debug.get("x-audio-debug-key")
        or debug.get("x-audio-debug-counter-key")
        or debug.get("x-audio-debug-client-ip")
        or debug.get("x-audio-debug-ip")
    )
    address_trace = {
        k: v
        for k, v in debug.items()
        if any(tok in k for tok in ("ip", "xff", "forwarded", "fdid", "key", "source"))
    }
    rec: Dict[str, Any] = {
        "case": case_name,
        "name": case_name,
        "target": target,
        "connection": connection,
        "method": method,
        "url": url,
        "status": status,
        "classification": cls,
        "rule": rule,
        "counter_key": counter_key,
        "address_trace": address_trace,
        "detail": detail,
        "retry_after": resp_headers.get("retry-after"),
        "debug": debug,
        "audio": audio_info if audio_info is not None else {"valid": False},
    }
    for dk, dv in debug.items():
        rec[dk] = dv
    return rec


def _state_path(front_url: str) -> Path:
    if os.environ.get("PROBE_STATE_FILE"):
        return Path(os.environ["PROBE_STATE_FILE"])
    h = hashlib.sha256(front_url.encode("utf-8")).hexdigest()[:12]
    return Path(tempfile.gettempdir()) / f"pte-audio-probe-state-{h}.json"


def build_arg_parser() -> argparse.ArgumentParser:
    p = argparse.ArgumentParser(description="Probe guest requests to /api/premium-tts.")
    p.add_argument("mode", nargs="?", default="inspect", help="inspect, prove, burst, usable, limited, or final")
    p.add_argument("front_door_url", nargs="?", default=None, metavar="FRONT_DOOR_URL")
    p.add_argument("gateway_url", nargs="?", default=None, metavar="GATEWAY_URL")
    p.add_argument("front_door_id", nargs="?", default=None, metavar="FRONT_DOOR_ID")
    p.add_argument("--out", "-o", "--output", dest="out", default="probe-results.json")
    p.add_argument("--from-staging-app", action="store_true")
    p.add_argument("--calls", "-n", "--count", dest="calls", type=int, default=5)
    p.add_argument("--window", type=int, default=60)
    p.add_argument("--front-url", "--public-url", dest="front_url_flag", default=None)
    p.add_argument("--gateway-url", dest="gateway_url_flag", default=None)
    p.add_argument("--front-door-id", dest="front_door_id_flag", default=None)
    p.add_argument("--text", default=DEFAULT_TEXT)
    p.add_argument("--altered-ip", default=DEFAULT_ALTERED_IP)
    p.add_argument("--app-runner", default=None)
    p.add_argument("--quiet", action="store_true")
    return p


def main(argv: Optional[Sequence[str]] = None) -> int:
    parser = build_arg_parser()
    args = parser.parse_args(argv)
    mode = (args.mode or "inspect").strip().lower()
    if mode not in VALID_MODES:
        parser.error(f"Unsupported MODE '{mode}'.")

    env = dict(os.environ)
    front_raw = (
        args.front_door_url
        or args.front_url_flag
        or env.get("FRONT_DOOR_URL")
        or env.get("FRONT_URL")
        or env.get("PUBLIC_URL")
    )
    gw_raw = args.gateway_url or args.gateway_url_flag or env.get("GATEWAY_URL") or env.get("APIM_GATEWAY_URL")
    fdid = args.front_door_id or args.front_door_id_flag or env.get("FRONT_DOOR_ID") or env.get("AZURE_FRONT_DOOR_ID")
    az_bin = env.get("AZ_BIN", "az")
    runner_cmd = args.app_runner or env.get("PROBE_APP_RUNNER_CMD")
    conn_name = "staging-app" if args.from_staging_app else "local"

    try:
        app_info = verify_and_resolve_staging_app(env, az_bin=az_bin) if (args.from_staging_app or mode == "aba") else None
    except Exception as exc:
        sys.stderr.write(f"ERROR: {exc}\n")
        return 1

    def send(c_name: str, url: str, method: str, hdrs: Sequence[Tuple[str, str]], body: Optional[bytes] = None):
        if c_name == "staging-app":
            assert app_info is not None
            return send_staging_app_request(url, method, hdrs, body, app_info, az_bin=az_bin, app_runner_cmd=runner_cmd)
        return send_local_request(url, method, hdrs, body)

    query = build_canonical_get_query(args.text)
    results: List[Dict[str, Any]] = []
    cases: Dict[str, Dict[str, Any]] = {}

    def add_case(rec: Dict[str, Any], *aliases: str) -> None:
        results.append(rec)
        cases[rec["case"]] = rec
        for a in aliases:
            cases[a] = rec

    if mode in ("inspect", "prove"):
        if not front_raw or not gw_raw or not fdid:
            sys.stderr.write("ERROR: FRONT_DOOR_URL, GATEWAY_URL, and FRONT_DOOR_ID are required.\n")
            return 1
        front_ep = normalize_target_endpoint(front_raw)
        gw_ep = normalize_target_endpoint(gw_raw)
        front_get, gw_get = f"{front_ep}?{query}", f"{gw_ep}?{query}"

        st, rh, bd, err = send(conn_name, front_get, "GET", build_request_headers("normal"))
        r_get = _build_record("normal-get", "public", conn_name, "GET", front_get, st, rh, bd, err)
        r_get["passed"] = r_get["classification"] == CLASSIFICATION_VALID_AUDIO
        add_case(r_get, "normal")

        p_body = json.dumps({"text": args.text}).encode("utf-8")
        st, rh, bd, err = send(conn_name, front_ep, "POST", build_request_headers("normal", extra_headers={"Content-Type": "application/json"}), p_body)
        r_post = _build_record("normal-post", "public", conn_name, "POST", front_ep, st, rh, bd, err)
        r_post["passed"] = r_post["classification"] == CLASSIFICATION_VALID_AUDIO
        add_case(r_post)

        st, rh, bd, err = send(conn_name, front_get, "GET", build_request_headers("altered", altered_ip=args.altered_ip))
        r_alt = _build_record("altered-get", "public", conn_name, "GET", front_get, st, rh, bd, err)
        spoof_alt = r_alt.get("counter_key") == args.altered_ip
        r_alt["passed"] = r_alt["classification"] == CLASSIFICATION_VALID_AUDIO and not spoof_alt
        add_case(r_alt, "altered", "altered-headers", "altered-xff")

        st, rh, bd, err = send(conn_name, front_get, "GET", build_request_headers("repeated-header"))
        r_rep = _build_record("repeated-header", "public", conn_name, "GET", front_get, st, rh, bd, err)
        spoof_rep = r_rep.get("counter_key") in DEFAULT_REPEATED_IPS
        r_rep["passed"] = r_rep["classification"] == CLASSIFICATION_VALID_AUDIO and not spoof_rep
        add_case(r_rep, "repeated", "repeated-xff")

        st, rh, bd, err = send(conn_name, gw_get, "GET", build_request_headers("normal"))
        r_dir = _build_record("direct-get", "gateway", conn_name, "GET", gw_get, st, rh, bd, err, require_rule=RULE_AUDIO_SOURCE)
        r_dir["passed"] = r_dir["classification"] == CLASSIFICATION_ACCESS_REFUSAL and r_dir.get("rule") == RULE_AUDIO_SOURCE
        add_case(r_dir, "direct", "direct-no-id")

        st, rh, bd, err = send(conn_name, gw_get, "GET", build_request_headers("altered", altered_ip=args.altered_ip, extra_headers={"X-Azure-FDID": fdid}))
        r_cop = _build_record("direct-copied", "gateway", conn_name, "GET", gw_get, st, rh, bd, err, require_rule=RULE_AUDIO_SOURCE)
        r_cop["passed"] = r_cop["classification"] == CLASSIFICATION_ACCESS_REFUSAL and r_cop.get("rule") == RULE_AUDIO_SOURCE
        add_case(r_cop, "copied-id")

    elif mode in ("burst", "usable", "limited", "aba"):
        if not front_raw:
            sys.stderr.write("ERROR: FRONT_DOOR_URL is required.\n")
            return 1
        front_ep = normalize_target_endpoint(front_raw)
        front_get = f"{front_ep}?{query}"
        hdrs = build_request_headers("normal")
        sp = _state_path(front_ep)
        ab_state: Dict[str, Any] = json.loads(sp.read_text(encoding="utf-8")) if sp.is_file() else {}

        if mode in ("burst", "aba"):
            c_a = "local" if mode == "aba" else conn_name
            lim_rec = None
            ok_cnt = 0
            for idx in range(1, max(args.calls + 2, 2) + 1):
                st, rh, bd, err = send(c_a, front_get, "GET", hdrs)
                if st == 429 or (st == 403 and extract_rule_name(rh, bd) == RULE_AUDIO_RATE):
                    lim_rec = _build_record("burst-limited", "public", c_a, "GET", front_get, st, rh, bd, err, require_rule=RULE_AUDIO_RATE)
                    lim_rec["passed"] = lim_rec["classification"] == CLASSIFICATION_RATE_LIMIT and lim_rec.get("rule") == RULE_AUDIO_RATE
                    add_case(lim_rec, f"burst-{idx}", "limited")
                    break
                r_b = _build_record(f"burst-{idx}", "public", c_a, "GET", front_get, st, rh, bd, err)
                r_b["passed"] = r_b["classification"] == CLASSIFICATION_VALID_AUDIO
                if r_b["passed"]:
                    ok_cnt += 1
                add_case(r_b)

            ab_state = {
                "connection_a": c_a,
                "a_limited": bool(lim_rec and lim_rec["passed"] and ok_cnt >= 1),
                "a_limited_rule": lim_rec.get("rule") if lim_rec else None,
                "a_limited_at": time.time(),
                "window_seconds": args.window,
                "b_connection": None,
                "b_usable": False,
                "a_still_limited": False,
                "within_window": False,
            }
            sp.write_text(json.dumps(ab_state), encoding="utf-8")

        elif mode == "usable":
            st, rh, bd, err = send(conn_name, front_get, "GET", hdrs)
            r_u = _build_record("usable", "public", conn_name, "GET", front_get, st, rh, bd, err)
            r_u["passed"] = r_u["classification"] == CLASSIFICATION_VALID_AUDIO and ab_state.get("connection_a") != conn_name
            add_case(r_u, "normal-get")
            if ab_state.get("a_limited") and ab_state.get("connection_a") != conn_name:
                ab_state["b_connection"] = conn_name
                ab_state["b_usable"] = bool(r_u["passed"])
                sp.write_text(json.dumps(ab_state), encoding="utf-8")

        elif mode == "limited":
            st, rh, bd, err = send(conn_name, front_get, "GET", hdrs)
            r_l = _build_record("still-limited", "public", conn_name, "GET", front_get, st, rh, bd, err, require_rule=RULE_AUDIO_RATE)
            elapsed = (time.time() - float(ab_state["a_limited_at"])) if ab_state.get("a_limited_at") else 0.0
            win = float(ab_state.get("window_seconds") or args.window)
            within = elapsed <= win
            seq_ok = (
                bool(ab_state.get("a_limited"))
                and ab_state.get("a_limited_rule") == RULE_AUDIO_RATE
                and ab_state.get("connection_a") == conn_name
                and bool(ab_state.get("b_usable"))
                and within
            ) if ab_state else True
            r_l["within_window"] = within
            r_l["passed"] = r_l["classification"] == CLASSIFICATION_RATE_LIMIT and r_l.get("rule") == RULE_AUDIO_RATE and seq_ok
            add_case(r_l, "limited")
            if ab_state:
                ab_state["a_still_limited"] = bool(r_l["passed"])
                ab_state["within_window"] = within
                sp.write_text(json.dumps(ab_state), encoding="utf-8")

    elif mode == "final":
        if not front_raw or not gw_raw:
            sys.stderr.write("ERROR: FRONT_DOOR_URL and GATEWAY_URL are required.\n")
            return 1
        front_ep = normalize_target_endpoint(front_raw)
        gw_ep = normalize_target_endpoint(gw_raw)
        front_get, gw_get = f"{front_ep}?{query}", f"{gw_ep}?{query}"

        st, rh, bd, err = send(conn_name, front_get, "GET", build_request_headers("normal"))
        r_get = _build_record("normal-get", "public", conn_name, "GET", front_get, st, rh, bd, err)
        r_get["passed"] = r_get["classification"] == CLASSIFICATION_VALID_AUDIO and not r_get["debug"]
        add_case(r_get, "normal")

        p_body = json.dumps({"text": args.text}).encode("utf-8")
        st, rh, bd, err = send(conn_name, front_ep, "POST", build_request_headers("normal", extra_headers={"Content-Type": "application/json"}), p_body)
        r_post = _build_record("normal-post", "public", conn_name, "POST", front_ep, st, rh, bd, err)
        r_post["passed"] = r_post["classification"] == CLASSIFICATION_VALID_AUDIO and not r_post["debug"]
        add_case(r_post)

        st, rh, bd, err = send(conn_name, gw_get, "GET", build_request_headers("normal"))
        r_dir = _build_record("direct-get", "gateway", conn_name, "GET", gw_get, st, rh, bd, err)
        r_dir["passed"] = r_dir["classification"] == CLASSIFICATION_ACCESS_REFUSAL and not r_dir["debug"]
        add_case(r_dir, "direct", "direct-no-id")

        st, rh, bd, err = send(conn_name, gw_get, "GET", build_request_headers("altered", altered_ip=args.altered_ip, extra_headers={"X-Azure-FDID": fdid or "00000000-0000-0000-0000-000000000000"}))
        r_cop = _build_record("direct-copied", "gateway", conn_name, "GET", gw_get, st, rh, bd, err)
        r_cop["passed"] = r_cop["classification"] == CLASSIFICATION_ACCESS_REFUSAL and not r_cop["debug"]
        add_case(r_cop, "copied-id")

    passed = (
        bool(cases.get("burst-limited", {}).get("passed")) and any(r["classification"] == CLASSIFICATION_VALID_AUDIO for r in results)
        if mode == "burst"
        else (all(r.get("passed") is True for r in results) and len(results) > 0)
    )
    report: Dict[str, Any] = {
        "timestamp": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"),
        "mode": mode,
        "connection": conn_name,
        "passed": passed,
        "request": {"method": "GET", "path": PREMIUM_TTS_ROUTE, "query": query, "expected_format": EXPECTED_AUDIO_FORMAT},
        "summary": {
            "total": len(results),
            CLASSIFICATION_VALID_AUDIO: sum(1 for r in results if r["classification"] == CLASSIFICATION_VALID_AUDIO),
            CLASSIFICATION_ACCESS_REFUSAL: sum(1 for r in results if r["classification"] == CLASSIFICATION_ACCESS_REFUSAL),
            CLASSIFICATION_RATE_LIMIT: sum(1 for r in results if r["classification"] == CLASSIFICATION_RATE_LIMIT),
            CLASSIFICATION_UNEXPECTED_FAILURE: sum(1 for r in results if r["classification"] == CLASSIFICATION_UNEXPECTED_FAILURE),
        },
        "cases": cases,
        "results": results,
    }
    if app_info is not None:
        report["staging_app"] = app_info
    if mode in ("burst", "usable", "limited", "aba") and front_raw:
        sp = _state_path(normalize_target_endpoint(front_raw))
        if sp.is_file():
            st_data = json.loads(sp.read_text(encoding="utf-8"))
            report["ab_sequence"] = {
                **st_data,
                "verified": bool(
                    st_data.get("a_limited")
                    and st_data.get("a_limited_rule") == RULE_AUDIO_RATE
                    and st_data.get("b_usable")
                    and st_data.get("a_still_limited")
                    and st_data.get("within_window")
                ),
            }

    out_text = json.dumps(report, indent=2)
    if args.out and args.out != "-":
        Path(args.out).parent.mkdir(parents=True, exist_ok=True)
        Path(args.out).write_text(out_text + "\n", encoding="utf-8")
    if not args.quiet or args.out == "-":
        sys.stdout.write(out_text + "\n")
    return 0 if passed else 1


if __name__ == "__main__":
    sys.exit(main())
