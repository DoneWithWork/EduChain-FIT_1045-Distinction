
# Certification Issuing Service (Blockchain-Based)

A certification issuing service that utilises blockchain to verify and issue certificates.

**Target use cases:**

* Online institutions such as *FreeCodeCamp*.
* University events held in Monash. Ability to import student emails and send a certificate to each.

  * **HD:** Emailing service.
* Each email is hashed to give a unique ID.

  * **HD:** Zero-Knowledge login (ZKLogin).

---

## Authentication System (Simple)

* User logs in using Google.
* Check the database for this user’s email.

  * If user does **not exist** → generate a unique blockchain address for them on the server.
  * If user **exists** → store their info in a session.

---

## Database Models (SQLite / SQL)

### `student`

* fullname
* email
* updated_at
* created_at
* deleted_at
* address
* role

### `role_enum`

* student
* issuer

### `issuer`

* institution_name
* email
* updated_at
* created_at
* deleted_at
* address
* role

---

## Student Experience

* Able to view certificates.
* For now → placeholder image.
* **HD:** Ability to add actual name of the user.

### Onboarding Process

* Students: enter **full name**.
* Issuers: enter **institution name** instead.

---

## Blockchain Component

* Smart Contract factory for NFTs.
* Sponsored transaction model → gas fees covered by the service owner.

### Certificate Model

* **id** → UID
* **student_email** → student’s email
* **owner** → issuer’s address
* **receiver** → student’s address
* **student_name**
* **institution_name**
* **text** → some text
* **image_url** → (HD: external file storage)
* **issued_date** → date
* **revoked_reason**
* **expiry** (optional) → some certs may expire
* **revoked**

---

## Contract Functions

### `new()`

* Issuer is able to mint multiple certificates for all emails placed in the dropdown.

### `new_cert(student_email: string, owner: address, receiver: address, student_name: string, institution_name: string, text: string, image_url: string, issued_date: vector<u8>, expiry?: vector<u8>)`

* Ownership of the object remains with the admin.
* Event is emitted.
* Backend listens to this event.

### `revoke_cert(hash: UID, owner: address, revoked_reason: string)`

* Toggles `revoked`.
* Updates `revoked_reason`.

---

## Simple Viewer

* Search by **email** or **name**.
* Text box for input.
* Updates a simple UI to show certificate chain.

