const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || 'https://qnkmshqupbkaqfosmfcy.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFua21zaHF1cGJrYXFmb3NtZmN5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA5Njc0NTcsImV4cCI6MjEwNjU0MzQ1N30.R-uUnjcLAmBfRbGw6aMxTallC0CFqcHXZ8xfyUhQA74';

let supabase = null;

if (supabaseUrl && supabaseKey) {
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false
      }
    });
    console.log('✅ Supabase conectado com sucesso!');
  } catch (err) {
    console.warn('⚠️ Falha ao inicializar cliente Supabase:', err.message);
  }
}

function isSupabaseConfigured() {
  return Boolean(supabase);
}

/**
 * Faz upload de uma imagem Base64 diretamente para o Supabase Storage
 * @param {string} base64Data - Imagem em data URL (data:image/jpeg;base64,...)
 * @param {string} prefix - Prefixo do arquivo
 * @returns {Promise<string>} URL pública da foto no Supabase
 */
async function uploadPhotoToStorage(base64Data, prefix = 'prod') {
  if (!supabase || !base64Data || !base64Data.startsWith('data:image')) {
    return base64Data;
  }

  try {
    const matches = base64Data.match(/^data:image\/([a-zA-Z0-9]+);base64,(.+)$/);
    if (!matches || matches.length < 3) return base64Data;

    const ext = matches[1] === 'jpeg' ? 'jpg' : matches[1];
    const buffer = Buffer.from(matches[2], 'base64');
    const fileName = `${prefix}_${Date.now()}_${Math.floor(Math.random() * 10000)}.${ext}`;

    const { data, error } = await supabase.storage
      .from('produtos-fotos')
      .upload(fileName, buffer, {
        contentType: `image/${matches[1]}`,
        upsert: true
      });

    if (error) {
      console.warn('⚠️ Erro no upload para Supabase Storage:', error.message);
      return base64Data;
    }

    const { data: publicData } = supabase.storage
      .from('produtos-fotos')
      .getPublicUrl(fileName);

    return publicData.publicUrl;
  } catch (err) {
    console.warn('⚠️ Falha ao salvar foto no Supabase:', err.message);
    return base64Data;
  }
}

module.exports = {
  supabase,
  isSupabaseConfigured,
  uploadPhotoToStorage
};
