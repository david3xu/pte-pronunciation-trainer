import Foundation
import Capacitor
import AVFoundation
import MediaPlayer

/**
 * Native background audio for iOS. Owns AVAudioSession, AVAudioPlayer,
 * MPNowPlayingInfoCenter, MPRemoteCommandCenter, and OS interruption/route
 * change handling -- the parts a WebView genuinely cannot do itself. Queue
 * sequencing, repeat mode, caching, and prefetch all stay in JS
 * (AudioQueueEngine/AudioCache); this plugin only ever plays one clip at a
 * time on command and reports what happened.
 *
 * play() receives an already-fetched base64 string, not a URL: JS is the
 * only thing that ever calls Azure/Gemini/Supabase-backed endpoints, so no
 * secret or network code exists here. This plugin decodes the base64 into a
 * temp file (AVAudioPlayer plays from a file URL, not raw bytes) and plays
 * that file. See src/services/audio/backgroundAudioPlugin.ts for why this
 * skips @capacitor/filesystem.
 */
@objc(BackgroundAudioPlugin)
public class BackgroundAudioPlugin: CAPPlugin, CAPBridgedPlugin {
    public let identifier = "BackgroundAudioPlugin"
    public let jsName = "BackgroundAudio"
    public let pluginMethods: [CAPPluginMethod] = [
        CAPPluginMethod(name: "play", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "pause", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "resume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "stop", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setRate", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "setVolume", returnType: CAPPluginReturnPromise),
        CAPPluginMethod(name: "getState", returnType: CAPPluginReturnPromise)
    ]

    private var player: AVAudioPlayer?
    private var loadedText: String?
    private var currentTempFileURL: URL?
    private var remoteCommandsConfigured = false
    /// Cleared by play(); set once audioPlayerDidFinishPlaying fires.
    /// Without this, canResume() could not tell a paused clip (safe to
    /// resume in place) from one that already finished (resuming it would
    /// try to replay from wherever AVAudioPlayer's cursor was left).
    private var hasFinished = false

    override public func load() {
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleInterruption),
            name: AVAudioSession.interruptionNotification,
            object: AVAudioSession.sharedInstance()
        )
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleRouteChange),
            name: AVAudioSession.routeChangeNotification,
            object: AVAudioSession.sharedInstance()
        )
    }

    deinit {
        NotificationCenter.default.removeObserver(self)
    }

    @objc func play(_ call: CAPPluginCall) {
        guard let base64Audio = call.getString("base64Audio"), !base64Audio.isEmpty else {
            call.reject("play() requires base64Audio")
            return
        }
        guard let audioData = Data(base64Encoded: base64Audio) else {
            call.reject("play() received base64Audio that could not be decoded")
            return
        }
        let text = call.getString("text") ?? ""
        let contentType = call.getString("contentType") ?? "audio/mpeg"

        do {
            try configureAudioSession()

            let tempURL = try writeTempFile(data: audioData, contentType: contentType)
            let newPlayer = try AVAudioPlayer(contentsOf: tempURL)
            newPlayer.delegate = self

            if let rate = call.getDouble("rate") {
                newPlayer.enableRate = true
                newPlayer.rate = Float(rate)
            }
            if let volume = call.getDouble("volume") {
                newPlayer.volume = Float(volume)
            }

            cleanupTempFile()
            player = newPlayer
            currentTempFileURL = tempURL
            loadedText = text
            hasFinished = false

            setNowPlayingInfo(
                title: call.getString("mediaTitle") ?? text,
                artist: call.getString("mediaArtist") ?? "",
                playbackRate: 1.0
            )

            newPlayer.prepareToPlay()
            print("[BackgroundAudioPlugin] Prepared native audio: bytes=\(audioData.count), contentType=\(contentType), duration=\(newPlayer.duration)")
            let didStart = newPlayer.play()
            if !didStart {
                player = nil
                loadedText = nil
                hasFinished = false
                cleanupTempFile()
                MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
                throw NSError(
                    domain: "BackgroundAudioPlugin",
                    code: 1,
                    userInfo: [
                        NSLocalizedDescriptionKey: "AVAudioPlayer.play() returned false (bytes: \(audioData.count), duration: \(newPlayer.duration))"
                    ]
                )
            }
            configureRemoteCommandsIfNeeded()

            call.resolve(["duration": newPlayer.duration])
        } catch {
            print("[BackgroundAudioPlugin] play() failed: \(error.localizedDescription)")
            call.reject("play() failed: \(error.localizedDescription)")
        }
    }

    @objc func pause(_ call: CAPPluginCall) {
        player?.pause()
        updateNowPlayingPlaybackRate(0)
        call.resolve()
    }

    @objc func resume(_ call: CAPPluginCall) {
        guard let player = player else {
            call.reject("resume() called with nothing loaded")
            return
        }
        do {
            try configureAudioSession()
        } catch {
            call.reject("resume() failed to reactivate the audio session: \(error.localizedDescription)")
            return
        }
        if let rate = call.getDouble("rate") {
            player.enableRate = true
            player.rate = Float(rate)
        }
        if let volume = call.getDouble("volume") {
            player.volume = Float(volume)
        }
        player.play()
        updateNowPlayingPlaybackRate(player.rate == 0 ? 1 : player.rate)
        call.resolve()
    }

    @objc func stop(_ call: CAPPluginCall) {
        player?.stop()
        player = nil
        loadedText = nil
        hasFinished = false
        cleanupTempFile()
        MPNowPlayingInfoCenter.default().nowPlayingInfo = nil
        call.resolve()
    }

    @objc func setRate(_ call: CAPPluginCall) {
        guard let rate = call.getDouble("rate") else {
            call.reject("setRate() requires rate")
            return
        }
        player?.enableRate = true
        player?.rate = Float(rate)
        call.resolve()
    }

    @objc func setVolume(_ call: CAPPluginCall) {
        guard let volume = call.getDouble("volume") else {
            call.reject("setVolume() requires volume")
            return
        }
        player?.volume = Float(volume)
        call.resolve()
    }

    @objc func getState(_ call: CAPPluginCall) {
        let loadedTextValue: Any = loadedText ?? NSNull()
        let canResumeValue = (player != nil) && (player?.isPlaying == false) && !hasFinished
        call.resolve([
            "loadedText": loadedTextValue,
            "canResume": canResumeValue
        ])
    }

    // MARK: - Audio session

    private func configureAudioSession() throws {
        let session = AVAudioSession.sharedInstance()
        try session.setCategory(.playback, mode: .default, options: [])
        try session.setActive(true)
    }

    // MARK: - Temp file handling

    private func writeTempFile(data: Data, contentType: String) throws -> URL {
        let extensionForType: String
        switch contentType {
        case "audio/wav", "audio/x-wav":
            extensionForType = "wav"
        case "audio/ogg":
            extensionForType = "ogg"
        default:
            extensionForType = "mp3"
        }
        let url = FileManager.default.temporaryDirectory
            .appendingPathComponent(UUID().uuidString)
            .appendingPathExtension(extensionForType)
        try data.write(to: url, options: .atomic)
        return url
    }

    private func cleanupTempFile() {
        if let url = currentTempFileURL {
            try? FileManager.default.removeItem(at: url)
        }
        currentTempFileURL = nil
    }

    // MARK: - Now Playing / remote commands

    private func setNowPlayingInfo(title: String, artist: String, playbackRate: Double? = nil) {
        var info: [String: Any] = [
            MPMediaItemPropertyTitle: title,
            MPMediaItemPropertyArtist: artist
        ]
        if let duration = player?.duration {
            info[MPMediaItemPropertyPlaybackDuration] = duration
        }
        if let currentTime = player?.currentTime {
            info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        }
        info[MPNowPlayingInfoPropertyPlaybackRate] = playbackRate ?? ((player?.isPlaying == true) ? 1.0 : 0.0)
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func updateNowPlayingPlaybackRate(_ rate: Float) {
        var info = MPNowPlayingInfoCenter.default().nowPlayingInfo ?? [:]
        info[MPNowPlayingInfoPropertyPlaybackRate] = rate
        if let currentTime = player?.currentTime {
            info[MPNowPlayingInfoPropertyElapsedPlaybackTime] = currentTime
        }
        MPNowPlayingInfoCenter.default().nowPlayingInfo = info
    }

    private func configureRemoteCommandsIfNeeded() {
        guard !remoteCommandsConfigured else { return }
        let commandCenter = MPRemoteCommandCenter.shared()

        commandCenter.playCommand.addTarget { [weak self] _ in
            self?.notifyListeners("remotePlay", data: nil)
            return .success
        }
        commandCenter.pauseCommand.addTarget { [weak self] _ in
            self?.notifyListeners("remotePause", data: nil)
            return .success
        }
        commandCenter.nextTrackCommand.addTarget { [weak self] _ in
            self?.notifyListeners("remoteNext", data: nil)
            return .success
        }
        commandCenter.previousTrackCommand.addTarget { [weak self] _ in
            self?.notifyListeners("remotePrevious", data: nil)
            return .success
        }
        commandCenter.stopCommand.addTarget { [weak self] _ in
            self?.notifyListeners("remoteStop", data: nil)
            return .success
        }

        remoteCommandsConfigured = true
    }

    // MARK: - Interruptions and route changes

    /// Fires on AVAudioSession.interruptionNotification .began (phone call,
    /// Siri, alarm, another app taking audio focus). Only reports the signal;
    /// recovery (a silent resume attempt, or escalating to a user-visible
    /// "tap to resume") is JS's call, via AudioQueueEngine's existing
    /// handleSuspended()/attemptRecovery() state machine, which this event
    /// maps to identically to the web onSuspended path.
    @objc private func handleInterruption(notification: Notification) {
        guard let info = notification.userInfo,
              let typeValue = info[AVAudioSessionInterruptionTypeKey] as? UInt,
              let type = AVAudioSession.InterruptionType(rawValue: typeValue) else {
            return
        }
        if type == .began {
            notifyListeners("interrupted", data: nil)
        }
    }

    /// Fires on AVAudioSession.routeChangeNotification. Only
    /// .oldDeviceUnavailable (headphones/Bluetooth disconnected) pauses --
    /// matching the platform convention every other iOS audio app follows,
    /// so audio does not suddenly continue through the phone speaker
    /// unexpectedly. New devices connecting need no action; playback just
    /// continues through the new route.
    @objc private func handleRouteChange(notification: Notification) {
        guard let info = notification.userInfo,
              let reasonValue = info[AVAudioSessionRouteChangeReasonKey] as? UInt,
              let reason = AVAudioSession.RouteChangeReason(rawValue: reasonValue) else {
            return
        }
        if reason == .oldDeviceUnavailable {
            player?.pause()
            updateNowPlayingPlaybackRate(0)
            notifyListeners("interrupted", data: nil)
        }
    }
}

extension BackgroundAudioPlugin: AVAudioPlayerDelegate {
    public func audioPlayerDidFinishPlaying(_ player: AVAudioPlayer, successfully flag: Bool) {
        hasFinished = true
        print("[BackgroundAudioPlugin] Finished native audio successfully=\(flag)")
        if flag {
            notifyListeners("ended", data: nil)
        } else {
            notifyListeners("error", data: ["message": "Playback finished unsuccessfully"])
        }
    }

    public func audioPlayerDecodeErrorDidOccur(_ player: AVAudioPlayer, error: Error?) {
        print("[BackgroundAudioPlugin] Decode error: \(error?.localizedDescription ?? "Audio decode error")")
        notifyListeners("error", data: ["message": error?.localizedDescription ?? "Audio decode error"])
    }
}
