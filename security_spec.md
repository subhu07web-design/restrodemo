# Security Specification: Restaurant Ordering App

## 1. Data Invariants

1. **Menu Items (`/menu_items/{itemId}`)**:
   - Anyone (authenticated or unauthenticated) can read and list menu items (so customers can see the menu).
   - Only admins (users listed in the `/admins` collection) can create, update, or delete menu items.
   - All menu item prices must be positive numbers.

2. **Orders (`/orders/{orderId}`)**:
   - Anyone can create an order (even guest checkout), or optionally signed-in users.
   - An order's total amount must equal the sum of its items' prices multiplied by quantities (verified client-side, with basic size constraints and positivity checks on fields in security rules).
   - Once placed, an order can only be read or modified by the customer who created it (identified by matching email or a matching optional UID) OR an authorized administrator.
   - Regular customers can only transition order status to "Cancelled" if it was "Pending".
   - Admins can transition order status to any state ("Preparing", "Out for Delivery", "Delivered", "Cancelled").
   - Terminal states ("Delivered", "Cancelled") cannot be updated to other states by anyone.

3. **Admins (`/admins/{adminId}`)**:
   - Users cannot write or register themselves in the `/admins` collection. This collection is write-protected; only existing admins (or manual setups) can edit. Reads are only allowed if signed in to verify admin status.

---

## 2. The "Dirty Dozen" Payloads (Exploit Attempts)

1. **Unauthenticated Menu Item Injection**:
   - Attempt: Post to `/menu_items/new_dish` by a regular client.
   - Expected Result: `PERMISSION_DENIED`.

2. **Unauthorized Menu Price Manipulation**:
   - Attempt: Regular user updates a `/menu_items/burger` price from $12 to $1.
   - Expected Result: `PERMISSION_DENIED`.

3. **Self-Assigned Admin Escalation**:
   - Attempt: Regular user writes `role: 'admin'` to `/admins/attacker_uid`.
   - Expected Result: `PERMISSION_DENIED`.

4. **Malicious Negative-Price Order**:
   - Attempt: Creating an order with `totalAmount: -100`.
   - Expected Result: `PERMISSION_DENIED`.

5. **Eavesdropping on Foreign Orders**:
   - Attempt: Attacker queries `/orders` without a customer email filter, or requests another customer's specific order.
   - Expected Result: `PERMISSION_DENIED`.

6. **Hijacking an Order Status (Client to "Delivered")**:
   - Attempt: Customer updates their own order status to "Delivered" to bypass payment or delivery checks.
   - Expected Result: `PERMISSION_DENIED` (only Admins can update to "Delivered").

7. **Tampering with Admin Privileges (Delete Admin)**:
   - Attempt: Attacker tries to delete `/admins/active_admin_uid`.
   - Expected Result: `PERMISSION_DENIED`.

8. **Giant ID Poisoning / Denial of Wallet**:
   - Attempt: Attacker generates a 10KB random junk string as a MenuItem ID.
   - Expected Result: `PERMISSION_DENIED` (enforced by `isValidId()`).

9. **Bypassing Menu Creation Validation (Missing Required Fields)**:
   - Attempt: Admin tries to create a MenuItem without a `price` field.
   - Expected Result: `PERMISSION_DENIED` (enforced by strict key checklist).

10. **Revived Terminal Order State**:
    - Attempt: Admin or user attempts to change a "Delivered" order status back to "Preparing".
    - Expected Result: `PERMISSION_DENIED` (terminal state lock).

11. **Massive Array Bloat (Denial of Wallet)**:
    - Attempt: Creating an order with 5,000 sub-items to inflate document read costs.
    - Expected Result: `PERMISSION_DENIED` (array limits `<= 100`).

12. **PII Exposure / Unauthorized User Scan**:
    - Attempt: Non-admin scans the `/orders` collection to harvest customer addresses and phone numbers.
    - Expected Result: `PERMISSION_DENIED` (reads require matching owner email/UID or admin status).

---

## 3. Test Runner Specification (`firestore.rules.test.ts`)

A test suite would typically load these payloads against the local emulator to verify that all operations are blocked. In our environment, the `firestore.rules` are deployed directly and verified via linter and compilation checks. We will write the robust `firestore.rules` next.
