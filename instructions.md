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

1. Run the **Set Admin Password** task and enter the email address you want to sign in with. Copy the password it shows.
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

This part is optional: Dawarich works on its own, and its OwnTracks Recorder actions only appear once OwnTracks Recorder is installed.

If your phones already send their locations to OwnTracks Recorder on this server, leave them as they are and let Dawarich follow the Recorder:

1. Install **OwnTracks Recorder** if it is not installed, and let each phone send at least one location to it.
2. In Dawarich, create an account for each person (**Settings → Users**).
3. With Dawarich running, run **Link OwnTracks Recorder User**. Pick the Recorder user and the Dawarich account their locations should go to.
4. Dawarich restarts, imports that person's full history (it appears on their **Imports** page), and from then on adds each new location within about 15 seconds.

Repeat for each person. **Unlink OwnTracks Recorder User** stops following someone; what was already imported stays.

Keep OwnTracks Recorder running. While it is stopped, Dawarich shows a warning about it and the **OwnTracks Recorder Sync** check says it is paused. Once the Recorder runs again, the locations it receives reach Dawarich as before.

The **OwnTracks Recorder Sync** check lists each person with the date of their newest location in OwnTracks Recorder. If a date stops moving while that person is out and about, their phone is no longer reaching OwnTracks Recorder: check the connection settings in their OwnTracks app.

The phones keep talking to OwnTracks Recorder, so its friends and map keep working as before. Deleting tracks in OwnTracks Recorder does not delete them from Dawarich.

If you would rather not run OwnTracks Recorder at all, point the OwnTracks app at Dawarich instead, as described under **Connecting a phone**. To bring the history over first, link each person, wait until their import shows as completed on their **Imports** page, then unlink them.

## Moving your data

- **Out of Dawarich, or into another Dawarich:** each person's **Account** page has **Export my data**, which builds an archive of everything in their account, and **Import my data**, which restores such an archive.
- **As GPX or GeoJSON:** the **Exports** page exports a chosen date range.
- **Into Dawarich from files:** the **Imports** page takes Google Takeout, OwnTracks `.rec`, GPX, GeoJSON, KML and more.

## Email

1. Run **Configure SMTP** and choose your StartOS system SMTP or another mail server.
2. Links in Dawarich's emails use your public domain if Dawarich has one, otherwise your `.local` address. To pick a different address, run **Set Primary URL**; only HTTPS addresses are offered. If the address you picked is removed later, the links move to one that still works.

Without email, you can still invite family members: Dawarich shows a link to copy on the invitation page.

## Actions

- **Set Admin Password:** sets the admin's sign-in email and generates a new password, also unlocking the account if it was locked after failed sign-ins. Use it to change that email or if you lose the password.
- **Configure SMTP** and **Set Primary URL:** see **Email** above.
- **Link OwnTracks Recorder User** and **Unlink OwnTracks Recorder User:** see **Using Dawarich with OwnTracks Recorder** above.

## Limitations

- The map loads its background tiles from Dawarich's tile server on the internet, so that server sees which areas you view. Each user can set another tile source in the map settings.
- Dawarich's **User registration** switch (under **Settings → Users**) turns back off when you restore a backup.
