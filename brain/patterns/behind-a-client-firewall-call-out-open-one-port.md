---
name: behind-a-client-firewall-call-out-open-one-port
description: "A server on a client's private LAN: everything calls out (CI runner, data pulls); ask for exactly one inbound port (443, plus 80 for the certificate) and hairpin NAT; prove 'no VPN' from the street, not through the tunnel"
metadata:
  type: project
---

**In short:** when a service lives on a client's private network but outsiders must reach it, design every other link to **call out**, and ask the client's IT for **one** inbound door.

**Why:** a server with a private IP (192.168.x, 10.x) is unreachable from the internet whatever it runs. Firewalls let residents out and keep strangers out. Each inbound port is a request to someone else's IT and one more thing exposed; outbound connections need nobody's permission.

**How to apply:**
1. Check direction for each link. Server → database on the same LAN: nothing needed. CI: a **self-hosted runner** on the server polls GitHub outbound; GitHub-hosted runners would need public SSH. Admin: keep the VPN, never public SSH.
2. The only inbound ask: forward **443 → server** (plus **80** for the Let's Encrypt HTTP check), and **hairpin NAT** so the public address also works from inside the office. Without hairpin it works from home and silently fails at the client's desk.
3. Ask a third party only what they alone can answer (port forward, account password expiry). Check sudo, packages, outbound access and DB ports yourself with read-only commands first. A first draft of 8 questions shrank to 3.
4. Prove "no VPN" from outside: `ip route get <public-ip>` must go via the normal gateway (not the tunnel's table, such as strongSwan's 220), then probe the ports. Rerun the same probe after IT says "done", and once from inside the office.

5. "IT says it's open" is checked like any claim. A test from inside the LAN against the **private** IP never touches the
   forward (the client's `telnet <lan-ip> 443` "failed" only meant nothing listened). Put a toy listener on 80/443 that
   logs source and **Host header**, then probe from outside. Refused = reached the host; timeout = dropped on the way.
6. The router may own several public IPs: the egress/VPN-gateway address is not necessarily the inbound one. Internet
   scanners hit every address, so the toy listener's `Host:` lines name the real inbound IP within minutes, with no IT needed.
7. Keep the toy listener alive past the SSH session with `sudo systemd-run --unit <name> --collect …`; `sudo nohup … &`
   over `ssh -t` dies at logout. Give it a timeout and stop it before the real deploy needs the ports.

**Signal:** "the client gave us a server", a private IP, "should work without VPN", CI to an on-prem box.
**Next time:** draw the who-reaches-what table first (link, direction, needs VPN?), then send one short message to the client's IT.

**Evidence:** 2026-10-20, client work: the "no-VPN" server came on a private IP that only answered through the tunnel; the outside probe showed 22/80/443 all closed. The design came down to one 3-question message.

2026-10-28, same client: IT said "80/443 opened, nothing running". The egress IP was closed from 6 countries; bot
requests logged by a toy listener carried `Host: <neighbour IP>`, and that neighbour address answered HTTPS from the
street. Claude first leaned on IT's word and a scanner's own IP; Giga's "how did you assume…" forced evidence-only claims.

Related: [[scheduled-jobs-run-where-their-inputs-live]], [[lockout-safe-auth-debugging]], [[answer-shape-short-first-map-for-how]]
