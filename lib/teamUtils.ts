import { createClient } from './supabase';

export async function getDefaultTeamProject() {
  const supabase = createClient();
  
  try {
    console.log('Fetching default team project...');
    const { data, error } = await supabase
      .from('teams')
      .select('*')
      .limit(1)
      .single();
    
    if (error) throw error;
    console.log('Fetched team data:', data);
    return data?.name || '';
  } catch (error) {
    console.error('Error fetching default team:', error);
    return '';
  }
}
