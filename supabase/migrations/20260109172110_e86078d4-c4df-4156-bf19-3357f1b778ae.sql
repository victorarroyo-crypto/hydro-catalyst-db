-- Crear función para deducir créditos de AI Advisor
CREATE OR REPLACE FUNCTION public.deduct_advisor_credits(
  p_user_id UUID,
  p_amount NUMERIC,
  p_model TEXT,
  p_description TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_current_balance NUMERIC;
  v_new_balance NUMERIC;
  v_free_queries_used INTEGER;
  v_free_queries_reset_at TIMESTAMPTZ;
  v_is_free BOOLEAN := false;
  v_credits_used NUMERIC := 0;
BEGIN
  -- Obtener datos actuales del usuario
  SELECT credits_balance, free_queries_used, free_queries_reset_at
  INTO v_current_balance, v_free_queries_used, v_free_queries_reset_at
  FROM advisor_users
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RETURN json_build_object(
      'success', false, 
      'error', 'Usuario no encontrado'
    );
  END IF;

  -- Resetear consultas gratuitas si ha pasado el período
  IF v_free_queries_reset_at < NOW() THEN
    v_free_queries_used := 0;
    UPDATE advisor_users
    SET free_queries_used = 0,
        free_queries_reset_at = NOW() + INTERVAL '30 days'
    WHERE id = p_user_id;
  END IF;

  -- Verificar si aplica consulta gratuita (gpt-4o-mini y < 5 consultas usadas)
  IF p_model = 'gpt-4o-mini' AND v_free_queries_used < 5 THEN
    v_is_free := true;
    v_credits_used := 0;
    v_new_balance := v_current_balance;
    
    -- Incrementar contador de consultas gratuitas
    UPDATE advisor_users
    SET free_queries_used = free_queries_used + 1,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Registrar transacción gratuita
    INSERT INTO advisor_credits (user_id, type, amount, balance_after, description, model_used)
    VALUES (p_user_id, 'free_query', 0, v_new_balance, p_description || ' (consulta gratuita)', p_model);
    
  ELSE
    -- Consulta de pago: verificar créditos suficientes
    IF v_current_balance < p_amount THEN
      RETURN json_build_object(
        'success', false, 
        'error', 'Créditos insuficientes', 
        'balance', v_current_balance,
        'required', p_amount
      );
    END IF;
    
    v_is_free := false;
    v_credits_used := p_amount;
    v_new_balance := v_current_balance - p_amount;
    
    -- Deducir créditos
    UPDATE advisor_users
    SET credits_balance = v_new_balance,
        updated_at = NOW()
    WHERE id = p_user_id;
    
    -- Registrar transacción de pago
    INSERT INTO advisor_credits (user_id, type, amount, balance_after, description, model_used)
    VALUES (p_user_id, 'usage', -p_amount, v_new_balance, p_description, p_model);
  END IF;

  RETURN json_build_object(
    'success', true,
    'is_free', v_is_free,
    'credits_used', v_credits_used,
    'new_balance', v_new_balance
  );
END;
$$;