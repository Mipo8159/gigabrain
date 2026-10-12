# CP-112 Region-scope all content

Content, and anything created from it, must belong to a region taken from the
**authenticated user record**, never from a request header. Headers are
client-controlled; the admin panel sends whatever region the admin last
selected in a dropdown.

- AC1 Creating content from the mobile app stores `regionId = req.user.regionId`.
- AC2 Creating content from the admin panel stores the admin's own `req.user.regionId`.
- AC3 A reel or lesson created by approving content inherits that content's `regionId`.
- AC4 Content listings stay filtered by the requesting user's region.
