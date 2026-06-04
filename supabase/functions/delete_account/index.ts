import { corsHeaders, errorJson, json } from '../_shared/cors.ts'
import { adminClient, getAuthenticatedUser } from '../_shared/supabase.ts'

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return errorJson(405, 'METHOD_NOT_ALLOWED')
  }

  const user = await getAuthenticatedUser(req)
  if (!user) {
    return errorJson(401, 'UNAUTHORIZED')
  }

  if (user.is_anonymous) {
    return errorJson(403, 'REGISTRATION_REQUIRED')
  }

  let payload: { email?: string; acceptedTerms?: boolean }
  try {
    payload = await req.json()
  } catch {
    return errorJson(400, 'INVALID_REQUEST')
  }

  const acceptedTerms = payload.acceptedTerms === true
  if (!acceptedTerms) {
    return errorJson(400, 'TERMS_NOT_ACCEPTED')
  }

  const userEmail = user.email?.trim().toLowerCase()
  const email = payload.email?.trim().toLowerCase()

  if (!userEmail || !email) {
    return errorJson(400, 'EMAIL_REQUIRED')
  }

  if (email !== userEmail) {
    return errorJson(400, 'EMAIL_MISMATCH')
  }

  const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
  if (deleteError) {
    return errorJson(500, 'ACCOUNT_DELETE_FAILED', deleteError.message)
  }

  return json(200, {
    success: true,
  })
})
