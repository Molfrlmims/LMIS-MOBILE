export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const token = request.headers.get("Authorization");

    if (!token) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const response = await fetch(
      "http://41.220.118.182:3000/price-reports/images",
      {
        method: "POST",
        headers: {
          Authorization: token,
        },
        body: formData,
      }
    );

    const data = await response.json();

    if (!response.ok) {
      return Response.json(data, { status: response.status });
    }

    return Response.json(data);
  } catch (error) {
    return Response.json({ error: "Upload failed" }, { status: 500 });
  }
}
