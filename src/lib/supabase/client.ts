// Mock Supabase complet pour la migration vers Convex
const createMockSupabaseClient = () => {
  // Mock pour les queries chainables
  const createQueryBuilder = (mockData: any[] = []) => ({
    select: (columns?: string) => createQueryBuilder(mockData),
    insert: (data: any) => ({ ...createQueryBuilder(mockData), then: (cb: any) => cb({ data: [data], error: null }) }),
    update: (data: any) => ({ ...createQueryBuilder(mockData), then: (cb: any) => cb({ data: [data], error: null }) }),
    delete: () => ({ ...createQueryBuilder(mockData), then: (cb: any) => cb({ data: [], error: null }) }),
    
    // Filtres
    eq: (column: string, value: any) => createQueryBuilder(mockData.filter(item => item[column] === value)),
    neq: (column: string, value: any) => createQueryBuilder(mockData.filter(item => item[column] !== value)),
    gt: (column: string, value: any) => createQueryBuilder(mockData),
    gte: (column: string, value: any) => createQueryBuilder(mockData),
    lt: (column: string, value: any) => createQueryBuilder(mockData),
    lte: (column: string, value: any) => createQueryBuilder(mockData),
    like: (column: string, pattern: string) => createQueryBuilder(mockData),
    ilike: (column: string, pattern: string) => createQueryBuilder(mockData),
    in: (column: string, values: any[]) => createQueryBuilder(mockData),
    is: (column: string, value: any) => createQueryBuilder(mockData),
    
    // Modificateurs
    order: (column: string, options?: any) => createQueryBuilder(mockData),
    limit: (count: number) => createQueryBuilder(mockData.slice(0, count)),
    range: (from: number, to: number) => createQueryBuilder(mockData.slice(from, to + 1)),
    
    // Exécution
    then: (callback: any) => callback({ data: mockData, error: null, count: mockData.length }),
    single: () => ({ then: (cb: any) => cb({ data: mockData[0] || null, error: null }) }),
    maybeSingle: () => ({ then: (cb: any) => cb({ data: mockData[0] || null, error: null }) }),
  })

  // Mock client principal
  return {
    auth: {
      getUser: () => Promise.resolve({ 
        data: { 
          user: { 
            id: 'mock-user-id', 
            email: 'admin@soren.fr',
            user_metadata: { name: 'Admin', avatar: null }
          } 
        }, 
        error: null 
      }),
      getSession: () => Promise.resolve({ data: { session: null }, error: null }),
      onAuthStateChange: (callback: any) => ({ 
        data: { subscription: { unsubscribe: () => {} } }
      }),
      signInWithPassword: () => Promise.resolve({ data: null, error: null }),
      signOut: () => Promise.resolve({ error: null }),
    },
    
    // Tables mock
    from: (table: string) => {
      const mockData = {
        user_profiles: [{ id: 1, name: 'Admin', avatar_url: null }],
        conversations: [],
        messages: [],
        contacts: [],
        devis: [],
        clients: []
      }
      return createQueryBuilder(mockData[table] || [])
    },
    
    // Realtime mock avec removeChannel
    channel: (topic: string) => ({
      on: (event: string, filter: any, callback: any) => ({
        subscribe: () => ({ unsubscribe: () => {} })
      }),
      subscribe: () => ({ unsubscribe: () => {} }),
      unsubscribe: () => {}
    }),
    
    // Ajout de removeChannel
    removeChannel: (channel: any) => {
      if (channel && typeof channel.unsubscribe === 'function') {
        channel.unsubscribe()
      }
    },
    
    // Storage mock
    storage: {
      from: (bucket: string) => ({
        upload: () => Promise.resolve({ data: { path: 'mock-file.jpg' }, error: null }),
        download: () => Promise.resolve({ data: new Blob(), error: null }),
        remove: () => Promise.resolve({ data: [], error: null }),
        list: () => Promise.resolve({ data: [], error: null }),
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://mock.supabase.co/storage/v1/object/public/${bucket}/${path}` } })
      })
    },
    
    // Functions mock
    functions: {
      invoke: () => Promise.resolve({ data: null, error: null })
    }
  }
}

export function createClient() {
  return createMockSupabaseClient()
}