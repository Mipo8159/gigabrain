# Projects API

JSON in, JSON out. Successful responses return the resource itself.

## Errors

Every error response has the same body, so clients can switch on `code`:

```json
{ "error": { "code": "not_found", "message": "project p_123 not found" } }
```

| status | code               |
|--------|--------------------|
| 400    | `bad_request`      |
| 403    | `forbidden`        |
| 404    | `not_found`        |
| 409    | `conflict`         |
| 422    | `validation_failed`|
| 500    | `internal`         |

## Endpoints

- `GET /projects` - list
- `POST /projects` - `{ name }` - create (422 on empty name, 409 on a duplicate name)
- `GET /projects/:id`
- `PATCH /projects/:id` - `{ name }` - rename
- `DELETE /projects/:id`
