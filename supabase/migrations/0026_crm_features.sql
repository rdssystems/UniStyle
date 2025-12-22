-- Migração para funcionalidade de CRM
-- 1. Adicionar campos ao cliente para CRM
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS is_vip BOOLEAN DEFAULT false;
ALTER TABLE public.clients ADD COLUMN IF NOT EXISTS preferences JSONB DEFAULT '{}'::jsonb;

-- 2. Tabela de Tags de CRM
CREATE TABLE IF NOT EXISTS public.crm_tags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    name TEXT NOT NULL,
    color TEXT DEFAULT '#794ed2',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indice para performance nas tags
CREATE INDEX IF NOT EXISTS idx_crm_tags_tenant ON public.crm_tags(tenant_id);

-- 3. Relação Clientes e Tags
CREATE TABLE IF NOT EXISTS public.client_tags_relation (
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    tag_id UUID REFERENCES public.crm_tags(id) ON DELETE CASCADE NOT NULL,
    PRIMARY KEY (client_id, tag_id)
);

-- 4. Tabela de Anotações do CRM (Imutável conforme solicitado)
CREATE TABLE IF NOT EXISTS public.client_crm_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID REFERENCES public.tenants(id) ON DELETE CASCADE NOT NULL,
    client_id UUID REFERENCES public.clients(id) ON DELETE CASCADE NOT NULL,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS para as novas tabelas
ALTER TABLE public.crm_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_tags_relation ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_crm_notes ENABLE ROW LEVEL SECURITY;

-- Políticas de RLS
-- crm_tags
CREATE POLICY "crm_tags_select" ON public.crm_tags FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "crm_tags_insert" ON public.crm_tags FOR INSERT TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "crm_tags_update" ON public.crm_tags FOR UPDATE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "crm_tags_delete" ON public.crm_tags FOR DELETE TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

-- client_tags_relation
CREATE POLICY "client_tags_relation_select" ON public.client_tags_relation FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "client_tags_relation_insert" ON public.client_tags_relation FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

CREATE POLICY "client_tags_relation_delete" ON public.client_tags_relation FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.clients WHERE id = client_id AND tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid())));

-- client_crm_notes
CREATE POLICY "client_crm_notes_select" ON public.client_crm_notes FOR SELECT TO authenticated
USING (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));

CREATE POLICY "client_crm_notes_insert" ON public.client_crm_notes FOR INSERT TO authenticated
WITH CHECK (tenant_id = (SELECT tenant_id FROM public.profiles WHERE id = auth.uid()));
-- Nota: Não há política de delete ou update para manter o histórico imutável como solicitado.

-- Adicionar tags padrão para novos tenants
-- (Opcional, pode ser feito via trigger ou manualmente no app)
