export default async function handler(_req, res) {
  return res.status(410).json({
    error: 'This endpoint was retired. Authenticate with Supabase Auth instead.',
  });
}
