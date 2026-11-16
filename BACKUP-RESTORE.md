# Backup and restore

**Backup:** `infrastructure/scripts/backup-mongo.sh` writes an `age`-encrypted `mongodump` archive, copies it off the server with `rclone`, verifies the upload and deletes copies older than 30 days. Also back up the `uploads` Docker volume (images) and keep the `.env.production` secrets and the **age private key** in a password manager, offline from the server.
**Restore test (do monthly, on a scratch database):**
```bash
rclone copyto remote:voxzin-YYYYMMDDTHHMMSSZ.archive.gz.age ./b.age
age -d -i key.txt b.age | mongorestore --uri="$SCRATCH_URI" --archive --gzip --nsFrom='voxzin.*' --nsTo='scratch.*'
```
Then start the API against the scratch database and confirm the homepage and `/admin/articles` load. A backup you haven't restored is a guess.
