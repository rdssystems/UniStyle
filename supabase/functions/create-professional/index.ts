import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { tenantId, name, email, password, specialties, avatarUrl, commissionPercentage } = await req.json();

    if (!tenantId || !name || !email || !password) {
      return new Response(JSON.stringify({ error: 'Campos obrigatórios ausentes.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const supabaseAdmin = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // 1. Criar o usuário de autenticação
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: password,
      email_confirm: true,
      user_metadata: { is_professional: true } // Flag to bypass the default tenant creation trigger
    });

    if (authError) {
      console.error('Erro ao criar usuário de autenticação:', authError);
      // Handle specific auth errors
      if (authError.message.includes('User already registered')) {
        return new Response(JSON.stringify({ error: 'Este email já está cadastrado como usuário.' }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 409, // Conflict
        });
      }
      // For other auth errors, return 400 Bad Request or 500 Internal Server Error
      return new Response(JSON.stringify({ error: authError.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400, // Or 500 depending on the nature of the error
      });
    }
    const newUserId = authData.user.id;

    // Safely extract first and last name
    const nameParts = name.split(' ');
    const firstName = nameParts[0] || '';
    const lastName = nameParts.slice(1).join(' ') || '';

    // 2. Criar o perfil do usuário com a função 'barber'
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUserId,
      tenant_id: tenantId,
      first_name: firstName, // Use safely extracted name
      last_name: lastName,   // Use safely extracted name
      role: 'barber', // Atribuindo a função de barbeiro
    });

    if (profileError) {
      console.error('Erro ao criar perfil do profissional:', profileError);
      // Rollback: deleta o usuário de autenticação se a criação do perfil falhar
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Erro ao criar perfil do profissional: ${profileError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    // 3. Inserir o registro na tabela 'professionals'
    const { data: professionalResult, error: professionalError } = await supabaseAdmin
      .from('professionals')
      .insert({
        tenant_id: tenantId,
        user_id: newUserId,
        name,
        email,
        specialties,
        avatar_url: avatarUrl,
        status: 'Disponível',
        color: 'gray',
        rating: 5.0,
        reviews: 0,
        commission_percentage: commissionPercentage,
      })
      .select()
      .single();

    if (professionalError) {
      console.error('Erro ao inserir profissional:', professionalError);
      // Rollback: deleta o usuário e o perfil
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return new Response(JSON.stringify({ error: `Erro ao inserir profissional: ${professionalError.message}` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      });
    }

    return new Response(JSON.stringify(professionalResult), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 201,
    });

  } catch (error) {
    console.error('Erro inesperado na função Edge:', error);
    return new Response(JSON.stringify({ error: `Erro inesperado: ${error.message}` }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});