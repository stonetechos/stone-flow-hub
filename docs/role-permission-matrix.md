# Role & Permission Matrix

Roles are stored in `public.user_roles` and checked by `public.has_role()` / `has_any_role()` in every RLS policy and RPC.

| Capability | admin | sales_manager | sales | purchase | production | installation | accounts | vendor | viewer |
|---|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|:-:|
| View all customers | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | own only | ✓ |
| Create / edit customer | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| Delete customer (soft) | ✓ | ✓ | — | — | — | — | — | — | — |
| Approve estimate | ✓ | ✓ | — | — | — | — | — | — | — |
| Issue quote | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| Convert to SO | ✓ | ✓ | ✓ | — | — | — | — | — | — |
| Raise RFQ / PO | ✓ | — | — | ✓ | — | — | — | — | — |
| Submit vendor quote | — | — | — | — | — | — | — | ✓ | — |
| Send to manufacturing | ✓ | ✓ | — | — | ✓ | — | — | — | — |
| Update production stage / QC | ✓ | — | — | — | ✓ | — | — | — | — |
| GRN | ✓ | — | — | ✓ | ✓ | — | — | — | — |
| Manage installation | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| Customer sign-off | ✓ | ✓ | — | — | — | ✓ | — | — | — |
| Raise invoice / credit note | ✓ | ✓ | — | — | — | — | ✓ | — | — |
| Record receipt | ✓ | — | — | — | — | — | ✓ | — | — |
| Vendor payment | ✓ | — | — | ✓ | — | — | ✓ | — | — |
| Executive / BI dashboards | ✓ | ✓ | read-only | — | — | — | read-only | — | — |
| Manage users / roles | ✓ | — | — | — | — | — | — | — | — |
| Reset demo data | ✓ | — | — | — | — | — | — | — | — |
| Vendor portal (`/vendor-portal`) | — | — | — | — | — | — | — | ✓ | — |

Every write path is enforced twice: (a) RLS policy on the target table and (b) `has_role()` guard inside the RPC / server function that mutates it.
