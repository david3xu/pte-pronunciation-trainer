targetScope = 'resourceGroup'

// Synthetic monitor for the public staging path.
//
// Every previous check of App Service, API Management and Front Door in this
// deployment was a one off curl run by a person. This resource turns that into a
// standing check: a small Linux VM that polls the public Front Door endpoint on a
// schedule and reports each result to Application Insights, which is already
// provisioned and already the destination for every other diagnostic setting in
// this estate.
//
// No inbound access of any kind is opened. The VM has no listening service, so
// there is nothing for an inbound rule to protect; its subnet's network security
// group carries an explicit deny rather than relying on the platform default,
// matching this file tree's preference for stating intent rather than assuming a
// default holds. Outbound HTTPS is what the monitor needs and what the default
// outbound rule already allows.
//
// SSH key only, password authentication disabled. The key is supplied by the
// operator; this module does not generate one, the same reasoning app-service.bicep
// applies to the Speech key: a value only this template can produce belongs in the
// template, and a value the operator already holds does not need to be re-derived.

@description('Azure region for the monitor VM and its network resources.')
param location string

@description('Tags applied to every resource in this module.')
param tags object

@description('Virtual machine name.')
param vmName string

@description('VM size. B2s is the smallest burstable size that clears the US$1 per day floor on its own; B1s does not.')
param vmSize string = 'Standard_B2s'

@description('Admin username for the monitor VM. Used for SSH only; nothing here runs as this user.')
param adminUsername string = 'ccladmin'

@description('SSH public key authorised for the admin user. Password authentication is disabled, so this is the only way in.')
param adminSshPublicKey string

@description('Public origin the monitor polls. The Front Door endpoint, not App Service directly, because Front Door is what a real user reaches.')
param monitorTargetUrl string

@description('Application Insights component name. The connection string is resolved from an existing reference rather than passed in, so it never appears in a module output.')
param appInsightsName string

@description('Log Analytics workspace resource id for diagnostics.')
param workspaceId string

@description('Polling interval in seconds.')
param pollIntervalSeconds int = 300

var vnetName = '${vmName}-vnet'
var subnetName = 'monitor'
var nsgName = '${vmName}-nsg'
var publicIpName = '${vmName}-pip'
var nicName = '${vmName}-nic'
var addressPrefix = '10.20.0.0/24'
var subnetPrefix = '10.20.0.0/27'

resource appInsights 'Microsoft.Insights/components@2020-02-02' existing = {
  name: appInsightsName
}

resource nsg 'Microsoft.Network/networkSecurityGroups@2023-11-01' = {
  name: nsgName
  location: location
  tags: tags
  properties: {
    securityRules: [
      {
        // Redundant with the platform default deny, stated anyway. A rule that is
        // absent reads as an oversight; a rule that is present and denies reads as
        // a decision.
        name: 'DenyAllInbound'
        properties: {
          priority: 4096
          direction: 'Inbound'
          access: 'Deny'
          protocol: '*'
          sourcePortRange: '*'
          destinationPortRange: '*'
          sourceAddressPrefix: '*'
          destinationAddressPrefix: '*'
        }
      }
    ]
  }
}

resource vnet 'Microsoft.Network/virtualNetworks@2023-11-01' = {
  name: vnetName
  location: location
  tags: tags
  properties: {
    addressSpace: {
      addressPrefixes: [addressPrefix]
    }
    subnets: [
      {
        name: subnetName
        properties: {
          addressPrefix: subnetPrefix
          networkSecurityGroup: {
            id: nsg.id
          }
        }
      }
    ]
  }
}

resource publicIp 'Microsoft.Network/publicIPAddresses@2023-11-01' = {
  name: publicIpName
  location: location
  tags: tags
  sku: {
    name: 'Standard'
  }
  properties: {
    publicIPAllocationMethod: 'Static'
    // No DNS label. Nothing addresses this VM by name; the public IP exists only
    // to give the NIC a stable path to the internet.
  }
}

resource nic 'Microsoft.Network/networkInterfaces@2023-11-01' = {
  name: nicName
  location: location
  tags: tags
  properties: {
    ipConfigurations: [
      {
        name: 'ipconfig1'
        properties: {
          subnet: {
            id: vnet.properties.subnets[0].id
          }
          privateIPAllocationMethod: 'Dynamic'
          publicIPAddress: {
            id: publicIp.id
          }
        }
      }
    ]
  }
}

// cloud-init. Installed at boot, not fetched afterward, so the monitor is running
// the moment the VM finishes provisioning and there is no ongoing dependency on
// reaching this VM to configure it.
//
// The instrumentation key is read out of the connection string with a plain shell
// parameter expansion rather than a dependency, since the only tool this image is
// guaranteed to have is a POSIX shell. It travels here the same way the Speech key
// travels into App Service: derived at deploy time from an existing resource,
// landing in a place the deployment plan already accepts as being as exposed as
// deployment history itself, and nowhere more exposed than that.
var monitorScript = '''#!/bin/bash
set -euo pipefail

TARGET_URL="${MONITOR_TARGET_URL}"
IKEY="${MONITOR_IKEY}"
INTERVAL="${MONITOR_INTERVAL_SECONDS}"

check_one() {
  local name="$1" path="$2" method="$3" body="${4:-}"
  local start status duration success

  start=$(date +%s%3N)
  if [ "$method" = "POST" ]; then
    status=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" -X POST "$TARGET_URL$path" \
      -H "content-type: application/json" -d "$body" || echo "000")
  else
    status=$(curl -sS -o /dev/null -m 15 -w "%{http_code}" "$TARGET_URL$path" || echo "000")
  fi
  duration=$(( $(date +%s%3N) - start ))

  if [ "$status" = "200" ]; then success="true"; else success="false"; fi

  local now
  now=$(date -u +%Y-%m-%dT%H:%M:%S.%3NZ)
  curl -sS -o /dev/null -m 10 -X POST "https://dc.services.visualstudio.com/v2/track" \
    -H "content-type: application/json" \
    -d "{\"name\":\"Microsoft.ApplicationInsights.Event\",\"time\":\"$now\",\"iKey\":\"$IKEY\",\"data\":{\"baseType\":\"EventData\",\"baseData\":{\"ver\":2,\"name\":\"synthetic_check\",\"properties\":{\"check\":\"$name\",\"status\":\"$status\",\"success\":\"$success\",\"durationMs\":\"$duration\"}}}}" \
    || true
}

while true; do
  check_one "health" "/health" "GET"
  check_one "voices" "/api/voices" "GET"
  check_one "premium_tts" "/api/premium-tts" "POST" '{"text":"synthetic monitor check"}'
  sleep "$INTERVAL"
done
'''

// Bicep's triple-quoted multi-line strings do not support interpolation, which is
// exactly right for monitorScript above (its `$` characters are bash's, not
// Bicep's, and must survive unevaluated). It is exactly wrong for this block,
// which has to substitute real parameter values, so this is built as a joined
// array of ordinary single-quoted strings instead, where `${...}` is interpreted.
// The instrumentation key is extracted from the connection string's first
// `key=value` segment rather than trusting segment order beyond that.
var monitorInstrumentationKey = split(split(appInsights.properties.ConnectionString, ';')[0], '=')[1]

var cloudInitLines = [
  '#cloud-config'
  'write_files:'
  '  - path: /opt/monitor/check.sh'
  '    permissions: \'0755\''
  '    content: |'
  '      ${replace(monitorScript, '\n', '\n      ')}'
  '  - path: /etc/systemd/system/synthetic-monitor.service'
  '    permissions: \'0644\''
  '    content: |'
  '      [Unit]'
  '      Description=Synthetic monitor for the staging Front Door path'
  '      After=network-online.target'
  '      Wants=network-online.target'
  '      '
  '      [Service]'
  '      Type=simple'
  '      Environment=MONITOR_TARGET_URL=${monitorTargetUrl}'
  '      Environment=MONITOR_IKEY=${monitorInstrumentationKey}'
  '      Environment=MONITOR_INTERVAL_SECONDS=${pollIntervalSeconds}'
  '      ExecStart=/opt/monitor/check.sh'
  '      Restart=always'
  '      RestartSec=15'
  '      '
  '      [Install]'
  '      WantedBy=multi-user.target'
  'runcmd:'
  '  - systemctl daemon-reload'
  '  - systemctl enable --now synthetic-monitor.service'
]
var cloudInit = join(cloudInitLines, '\n')

resource vm 'Microsoft.Compute/virtualMachines@2024-07-01' = {
  name: vmName
  location: location
  tags: tags
  properties: {
    hardwareProfile: {
      vmSize: vmSize
    }
    osProfile: {
      computerName: vmName
      adminUsername: adminUsername
      linuxConfiguration: {
        disablePasswordAuthentication: true
        ssh: {
          publicKeys: [
            {
              path: '/home/${adminUsername}/.ssh/authorized_keys'
              keyData: adminSshPublicKey
            }
          ]
        }
        // Patches applied automatically. No one is logging in to run apt upgrade
        // on a box whose SSH port is not open by default.
        patchSettings: {
          patchMode: 'AutomaticByPlatform'
          automaticByPlatformSettings: {
            rebootSetting: 'IfRequired'
          }
        }
      }
      customData: base64(cloudInit)
    }
    storageProfile: {
      imageReference: {
        publisher: 'Canonical'
        offer: 'ubuntu-24_04-lts'
        sku: 'server'
        version: 'latest'
      }
      osDisk: {
        createOption: 'FromImage'
        managedDisk: {
          storageAccountType: 'Standard_LRS'
        }
      }
    }
    networkProfile: {
      networkInterfaces: [
        {
          id: nic.id
        }
      ]
    }
    // Automatic OS shutdown is deliberately absent. A monitor that goes quiet
    // every night would report the target as healthy for the hours it was not
    // looking, which is worse than not monitoring at all.
  }
}

resource vmDiagnostics 'Microsoft.Insights/diagnosticSettings@2021-05-01-preview' = {
  name: 'monitor-vm-diagnostics'
  scope: nic
  properties: {
    workspaceId: workspaceId
    metrics: [
      {
        category: 'AllMetrics'
        enabled: true
      }
    ]
  }
}

output vmName string = vm.name
output vmId string = vm.id
output publicIpAddress string = publicIp.properties.ipAddress
