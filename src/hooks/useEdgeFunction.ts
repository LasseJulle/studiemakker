import { supabase } from '../lib/supabase'

export function useEdgeFunction<TPayload, TResponse>(functionName: string) {
  return async (payload: TPayload): Promise<TResponse> => {
    const { data, error } = await supabase.functions.invoke(functionName, {
      body: payload,
    })

    if (error) {
      console.error(`Edge function ${functionName} error:`, error)
      throw error
    }

    return data as TResponse
  }
}
