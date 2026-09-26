# Dawarich

## Documentation

- [Dawarich documentation](https://dawarich.app/docs/intro) — the upstream guide to tracking apps, imports, settings and integrations.

## What you get on StartOS

- **Dawarich with its own database**, ready to sign in to. The package creates the admin account for you, so the public demo login upstream ships with never exists on your server.
- **One address for everything:** the **Web UI** interface is both the website you open and the address your phone apps send locations to.
- **Optional OwnTracks Recorder sync:** if you already run OwnTracks Recorder on this server, Dawarich can import each person's history from it and keep adding their new locations.
- **Optional email** for password resets, family invitations and monthly digests.

Your location history, uploaded files and settings are part of your StartOS backups.

## Getting set up

1. Run the **Set Admin Password** task. Copy the email and password it shows.
2. Start Dawarich. The first start takes a minute or more while it builds its database.
3. Open the **Web UI** interface and sign in with that email and password. You can change both under **Account** in Dawarich.
4. Under **Settings → General**, set your time zone. It starts as UTC.
5. To add people, open **Settings → Users** and create an account for each of them.

### Connecting a phone

Each person's **Account** page in Dawarich shows their API key, a QR code for the Dawarich app, and ready-made URLs for OwnTracks and Overland. They point at the address you opened Dawarich on, so open it on the address the phone will use.

- **Dawarich app (iOS or Android):** scan the QR code, or enter the Web UI address and the API key.
- **OwnTracks:** in the app's connection settings choose **HTTP** mode and paste the OwnTracks URL from the Account page. In this mode Dawarich also shows the phone the positions of family members who share their location.
- **Overland, GPSLogger, Home Assistant and others:** see the tracking-apps section of the Dawarich documentation.

On a `.local` or LAN IP address, the phone has to trust your server's root CA, the same one your browser was asked to trust when you set up StartOS. A public domain with a publicly trusted certificate needs no CA on the phone.

### Place names

Out of the box Dawarich does not look up addresses, so visits, places and city statistics stay unnamed. An admin can pick a reverse-geocoding provider under **Settings → Instance**. That provider then receives the coordinates Dawarich looks up.

## Using Dawarich with OwnTracks Recorder

If your phones already send their locations to OwnTracks Recorder on this server, leave them as they are and let Dawarich follow the Recorder:

1. Install **OwnTracks Recorder** if it is not installed, and let each phone send at least one location to it.
2. In Dawarich, create an account for each person (**Settings → Users**).
3. With Dawarich running, run **Link OwnTracks Recorder User**. Pick the Recorder user and the Dawarich account their locations should go to.
4. Dawarich restarts, imports that person's full history (it appears on their **Imports** page), and from then on adds each new location within about 15 seconds.

Repeat for each person. **Unlink OwnTracks Recorder User** stops following someone; what was already imported stays.

The phones keep talking to OwnTracks Recorder, so its friends and map keep working as before. Deleting tracks in OwnTracks Recorder does not delete them from Dawarich.

If you would rather not run OwnTracks Recorder at all, point the OwnTracks app at Dawarich instead, as described under **Connecting a phone**.

## Email

1. Run **Configure SMTP** and choose your StartOS system SMTP or another mail server.
2. Links in Dawarich's emails use your `.local` address by default. To use another address, run **Set Primary URL**.

Without email, you can still invite family members: Dawarich shows a link to copy on the invitation page.

## Actions

- **Set Admin Password:** generates a new admin password, also unlocking the account if it was locked after failed sign-ins. Use it if you lose the password.
- **Configure SMTP** and **Set Primary URL:** see **Email** above.
- **Link OwnTracks Recorder User** and **Unlink OwnTracks Recorder User:** see **Using Dawarich with OwnTracks Recorder** above.

## Limitations

- The map loads its background tiles from Dawarich's tile server on the internet, so that server sees which areas you view. Each user can set another tile source in the map settings.
- Dawarich's **User registration** switch (under **Settings → Users**) turns back off when you restore a backup.
