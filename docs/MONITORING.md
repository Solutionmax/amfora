# Monitoring

Amfora gives the figures a monitoring system needs at one address:

```
GET /api/v1/metrics
```

The answer is plain text in the Prometheus format, so Prometheus, Grafana Agent, VictoriaMetrics
and Zabbix can all read it.

## Who may read it

Only an API key of an **administrator**. Make one on your **Profile** page, section **API keys**
(read only is enough). Everything else is refused:

| Answer | Meaning                                                                      |
| ------ | ---------------------------------------------------------------------------- |
| 401    | No key, an unknown or expired key, or an inactive user.                      |
| 403    | The key belongs to a member, or the request is a browser session, not a key. |

The key keeps working while two step sign in is required: keys are not asked for a second step.
Amfora reads the owner of the key from the database at every call, so a key stops opening the
figures the moment its owner is no longer an active administrator. The figures are cached for 30
seconds, so a scraper cannot load the database. Scrape every 30 to 60 seconds.

```bash
curl -s https://files.example.com/api/v1/metrics -H "Authorization: Bearer amf_..."
```

## What it reports

| Metric                                                                        | Meaning                                                  |
| ----------------------------------------------------------------------------- | -------------------------------------------------------- |
| `amfora_info{version="..."}`                                                  | Always 1. The label holds the running version.           |
| `amfora_database_up`                                                          | 1 when the database answers, 0 when not.                 |
| `amfora_storage_up`                                                           | 1 when the object storage answers, 0 when not.           |
| `amfora_users{kind}`                                                          | `total`, `active` and `admin` (active administrators).   |
| `amfora_files`, `amfora_files_bytes`                                          | Files in the workspace, trash excluded.                  |
| `amfora_receive_files`, `..._bytes`                                           | Files received through receive links.                    |
| `amfora_trash_files`, `..._bytes`                                             | Files in the trash.                                      |
| `amfora_shares{state}`                                                        | `total`, `active`, `expired`.                            |
| `amfora_receive_links{state}`                                                 | `total`, `active`.                                       |
| `amfora_secrets{state}`                                                       | `total`, `active` (not opened up, not expired).          |
| `amfora_disk_total_bytes`, `amfora_disk_used_bytes`, `amfora_disk_free_bytes` | The data disk. Left out when the host does not tell.     |
| `amfora_scan_enabled`                                                         | 1 when the [virus scan](VIRUS-SCAN.md) is on, else 0.    |
| `amfora_scan_files{status}`                                                   | Files per scan status. Only present when the scan is on. |

If the database does not answer, the answer still comes, with `amfora_database_up 0` and without
the figures that need it.

## Prometheus

```yaml
scrape_configs:
  - job_name: amfora
    metrics_path: /api/v1/metrics
    scheme: https
    scrape_interval: 60s
    authorization:
      type: Bearer
      credentials: amf_... # or credentials_file: /etc/prometheus/amfora.key
    static_configs:
      - targets: ["files.example.com"]
```

A useful alert: `amfora_database_up == 0 or amfora_storage_up == 0`, and
`amfora_disk_free_bytes / amfora_disk_total_bytes < 0.1`.

## Zabbix

Zabbix 6 and newer read the Prometheus format with an HTTP agent item and a preprocessing step.

1. Make a master item. Type **HTTP agent**, key `amfora.metrics`, URL
   `https://files.example.com/api/v1/metrics`, type of information **Text**, update interval
   `1m`. Under **Headers** add `Authorization` with the value `Bearer amf_...` (put the key in a
   user macro of type secret and use `Bearer {$AMFORA.KEY}`).
2. Add dependent items on the master item. Type **Dependent item**, master item
   `amfora.metrics`, and a preprocessing step **Prometheus pattern**:

| Item key              | Pattern                       | Output |
| --------------------- | ----------------------------- | ------ |
| `amfora.database.up`  | `amfora_database_up`          | value  |
| `amfora.storage.up`   | `amfora_storage_up`           | value  |
| `amfora.files.bytes`  | `amfora_files_bytes`          | value  |
| `amfora.disk.free`    | `amfora_disk_free_bytes`      | value  |
| `amfora.users.active` | `amfora_users{kind="active"}` | value  |

3. Add triggers, for example `last(/amfora/amfora.database.up)=0` and
   `last(/amfora/amfora.storage.up)=0`.

To find the version, use the preprocessing step **Prometheus to JSON** on a text item and read
the label with a JSONPath.
