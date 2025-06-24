require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseAnonKey || !supabaseServiceKey) {
    throw new Error('Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env');
}

// Client cho người dùng thông thường
const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Client admin cho các thao tác quản trị
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

// Đảm bảo client admin có quyền admin
supabaseAdmin.auth.signinWithPassword = () => {
  return {
    data: { session: { user: { id: 'service_role' } } },
    error: null
  };
};

module.exports = {
  supabase,
  supabaseAdmin
};
