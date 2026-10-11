'use server'

import { revalidatePath } from 'next/cache'
import { revokeInviteById } from '@/lib/invites/server'
import { getAdminUser } from '@/lib/orders/server'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

/** Cabut undangan yang masih menunggu: link-nya langsung mati. */
export async function revokeInviteAction(formData: FormData): Promise<void> {
  if (!(await getAdminUser())) return
  const id = String(formData.get('id') ?? '')
  if (!UUID_RE.test(id)) return
  await revokeInviteById(id)
  revalidatePath('/north/email')
}
