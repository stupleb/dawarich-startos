# Dawarich

## Documentation

- [Dawarich documentation](https://dawarich.app/docs/intro) — the upstream guide to tracking apps, imports, settings and integrations.

## What you get on StartOS

- **Dawarich with its own database**, ready to sign in to. The package creates the admin account for you, so the public demo login upstream ships with never exists on your server.
- **One address for everything:** the **Web UI** interface is both the website you open and the address your phone apps send locations to.
- **Optional OwnTracks Recorder sync:** if you already run OwnTracks Recorder on this server, Dawarich can import each person's history from it and keep adding their new locations.
- **Optional Immich photos:** if you run Immich on this server, Dawarich can show each person's photos on their map.
- **Optional AirTrail flights:** if you run AirTrail on this server, Dawarich can import each person's flights and draw them on their map.
- **Optional address lookups with Photon:** if you run Photon on this server, Dawarich can name the places in your history without asking an outside service.
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

## Showing Immich photos

This part is optional, and its actions only appear once Immich is installed.

Dawarich can show each person's Immich photos on their map, at the places they were taken. You connect their Dawarich account in Dawarich, then approve it in Immich with the Immich account that uses the same email address.

1. Check that the person's Dawarich account (**Account** in Dawarich) and their Immich account use the same email address. Change one of them if they differ.
2. With Dawarich and Immich running, run **Connect Immich** and choose the person's Dawarich account. Leave **Add locations to photos** off unless you want Dawarich's Enrich feature to write positions from their location history into their Immich photos that have none.
3. On Immich's page in StartOS, open the task that names **dawarich** and the person's email. Leave **Approve** selected, choose the person's account under **Immich Account**, and submit.
4. Within a minute, Dawarich's **Immich** health check lists the person's email as connected. Open their map in Dawarich: their photos appear for the dates you view.

The person doesn't have to do anything in Immich, and whoever approves the request decides whose photos Dawarich reads. Immich lists the key Dawarich uses among that account's API keys as "StartOS: dawarich".

Dawarich can't tell a denied request from one still waiting, so after a denial its **Immich** health check keeps asking for approval. Run **Disconnect Immich** to drop the request, or **Connect Immich** again to ask again. If you approved it with someone else's Immich account, the health check says so: run **Connect Immich** again. Running it again also changes **Add locations to photos**; the current connection keeps working until you approve the new request. **Disconnect Immich** stops Dawarich reading their photos and deletes the key in Immich.

Photos without a location stay off the map. With **Add locations to photos** on, Dawarich's Enrich feature can add one from the person's location history.

If you'd rather not give both accounts the same email, the person can connect under **Settings → Integrations** in Dawarich instead, with an API key they create in Immich and Immich's address. Use the LAN IP address shown on Immich's **Web UI** interface, port included, such as `https://192.168.1.20:12345`: Dawarich can't reach `.local` addresses from inside StartOS.

## Importing flights from AirTrail

This part is optional, and its actions only appear once AirTrail is installed.

Dawarich can import the flights a person logged in AirTrail and draw them on their map. You connect their Dawarich account in Dawarich, then approve it in AirTrail.

1. Find the person's current username in AirTrail (their **Settings → General**). People can change it, so check it now rather than from memory.
2. With Dawarich and AirTrail running, run **Connect AirTrail**, choose the person's Dawarich account and enter that AirTrail username.
3. On AirTrail's page in StartOS, open the task that names **dawarich**, the person's email and the username. Leave **Approve** selected, choose that account under **AirTrail Account**, and submit.
4. Within a minute, Dawarich's **AirTrail** health check shows the person's email and AirTrail account as connected, and their flights are imported.

If the account you approved isn't the username you entered, nothing is imported. Dawarich raises a task instead: run **Confirm AirTrail Account** to use that account or to refuse it, which removes Dawarich's key from AirTrail. This stops one person's flights from landing in another person's Dawarich account.

To see the flights, open the map, turn on the **Flights** layer in its **Layers** tab, and choose dates that include them: the map only shows what's in the dates you're viewing. Dawarich imports only flights where the chosen AirTrail account is a passenger, syncs once a day, and **Sync AirTrail flights** under **Settings → Integrations** syncs at once.

The approved AirTrail account keeps working if its username is changed later. If you denied the request, Dawarich's **AirTrail** health check keeps asking for approval: run **Disconnect AirTrail** to drop it, or **Connect AirTrail** to ask again. **Disconnect AirTrail** stops the import and deletes Dawarich's key in AirTrail.

## Looking up addresses with Photon

This part is optional, and its actions only appear once Photon is installed.

Dawarich turns locations into addresses (city, street, country) with a geocoding service. Photon keeps that lookup on your own server.

1. In Photon, choose the countries your history covers, and wait until it has finished building its data.
2. With Dawarich and Photon running, run **Connect Photon**.

Dawarich fills in addresses about a minute after each new location arrives, and existing locations without one overnight. Photon only knows the countries you chose in it: a location anywhere else gets no address. To redo every address, for example after adding a country to Photon, open **Settings → Background Jobs** in Dawarich and start **reverse geocoding**.

Connect Photon fills in the **Photon** section under **Settings → Instance** in Dawarich. The **API key** field stays empty, because Photon on StartOS needs none. That section's **Test connection** button always looks up the same point in Leipzig, Germany, so it reports "no results" unless your Photon includes Germany; that still means Dawarich reached Photon.

**Disconnect Photon** stops Dawarich using Photon. Addresses already found stay. If you changed the Photon host under **Settings → Instance** yourself, Disconnect leaves your setting alone.

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
- **Connect Immich** and **Disconnect Immich:** see **Showing Immich photos** above.
- **Connect AirTrail**, **Confirm AirTrail Account** and **Disconnect AirTrail:** see **Importing flights from AirTrail** above.
- **Connect Photon** and **Disconnect Photon:** see **Looking up addresses with Photon** above.

## Limitations

- The map loads its background tiles from Dawarich's tile server on the internet, so that server sees which areas you view. Each user can set another tile source in the map settings.
- Dawarich's **User registration** switch (under **Settings → Users**) turns back off when you restore a backup.
