async function load() {
  if (!user) return;

  const tables = [
    'contacts',
    'offers',
    'campaigns',
    'campaign_recipients'
  ];

  const results = await Promise.all(
    tables.map(async table => {
      try {
        const { data, error } = await db
          .from(table)
          .select('*');

        return {
          table,
          data: data || [],
          error
        };
      } catch (error) {
        return {
          table,
          data: [],
          error
        };
      }
    })
  );

  const errors = results.filter(r => r.error);

  [contacts, offers, campaigns, recipients] =
    results.map(r => r.data);

  render();

  if (errors.length) {
    notice(
      'Erro ao carregar: ' +
      errors.map(r =>
        r.table + ': ' + r.error.message
      ).join(' | ')
    );
  } else {
    notice('');
  }
}
