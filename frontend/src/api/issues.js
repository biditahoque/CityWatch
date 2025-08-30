// src/api/issues.js
import { supabase } from './supabase';

// List issues for the map (Step 6)
export async function listIssues() {
  const { data, error } = await supabase
    .from('issues')
    .select('id,title,type,description,city,status,photo_url,lat,lng,creator_id,created_at,updated_at')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data || [];
}

// Upload one photo to the public bucket and return its public URL
export async function uploadIssuePhoto(file, userId) {
  if (!file) return null;

  // Make a unique path like: userId/<uuid>.<ext>
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${crypto.randomUUID()}.${ext}`;

  const { error: upErr } = await supabase
    .storage
    .from('issue-photos')     // bucket name
    .upload(path, file, { cacheControl: '3600', upsert: false, contentType: file.type });

  if (upErr) throw upErr;

  const { data } = supabase.storage.from('issue-photos').getPublicUrl(path);
  return data.publicUrl; // e.g., https://.../object/public/issue-photos/userId/uuid.jpg
}

// Create the issue row (RLS expects creator_id === auth.uid())
export async function createIssue({ userId, title, type, description, city, lat, lng, photo_url }) {
  const payload = {
    title,
    type,
    description: description || null,
    city,
    status: 'open',
    photo_url: photo_url || null,
    lat,
    lng,
    creator_id: userId,       // IMPORTANT for RLS
  };

  const { data, error } = await supabase.from('issues').insert(payload).select().single();
  if (error) throw error;
  return data;
}

// Mark an issue resolved (RLS allows only the creator to update)
export async function resolveIssue(issueId) {
  const { data, error } = await supabase
    .from('issues')
    .update({ status: 'resolved' })
    .eq('id', issueId)
    .select()
    .single();

  if (error) throw error;
  return data; // returns the updated row
}

