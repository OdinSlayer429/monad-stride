// Server-side proxy to Pinata's pinJSONToIPFS endpoint. Pins a run's signed checkpoint
// chain so anyone (a judge, a disputer) can pull it down independently instead of
// trusting the app's own UI. Deliberately server-side: the Pinata JWT is a write-scoped
// secret, and embedding it in client code would let anyone extract it from the bundle
// and pin arbitrary data to this project's Pinata account. See CLAUDE.md ("Real IPFS
// pinning wiring") for the account/env-var setup this route depends on.

const MAX_CHECKPOINTS = 10_000; // generous sanity cap, not a real-world run length

export async function POST(request: Request) {
  const jwt = process.env.PINATA_JWT;
  if (!jwt) {
    return Response.json(
      { error: "IPFS pinning isn't configured on this deployment (missing PINATA_JWT)." },
      { status: 501 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("checkpoints" in body) ||
    !Array.isArray((body as { checkpoints: unknown }).checkpoints)
  ) {
    return Response.json({ error: "Expected a { checkpoints: [...] } body." }, { status: 400 });
  }

  const checkpoints = (body as { checkpoints: unknown[] }).checkpoints;
  if (checkpoints.length === 0 || checkpoints.length > MAX_CHECKPOINTS) {
    return Response.json({ error: "checkpoints must be a non-empty array within size limits." }, { status: 400 });
  }

  try {
    const pinataRes = await fetch("https://api.pinata.cloud/pinning/pinJSONToIPFS", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({
        pinataContent: body,
        pinataMetadata: { name: `stride-checkpoints-${Date.now()}` },
      }),
    });

    if (!pinataRes.ok) {
      const detail = await pinataRes.text();
      console.error("Pinata pin failed:", pinataRes.status, detail);
      return Response.json({ error: "Pinata rejected the pin request." }, { status: 502 });
    }

    const data = (await pinataRes.json()) as { IpfsHash?: string };
    if (!data.IpfsHash) {
      return Response.json({ error: "Pinata response missing IpfsHash." }, { status: 502 });
    }

    return Response.json({ cid: data.IpfsHash });
  } catch (err) {
    console.error("Failed to reach Pinata:", err);
    return Response.json({ error: "Failed to reach Pinata." }, { status: 502 });
  }
}
