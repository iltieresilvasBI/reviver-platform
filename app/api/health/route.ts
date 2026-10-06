export async function GET() {
  return Response.json({
    ok: true,
    service: "reviver-platform",
    timestamp: new Date().toISOString(),
  });
}
