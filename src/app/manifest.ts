import { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
    return {
        name: 'LUMOS IL | קהילת הקוסמים',
        short_name: 'Lumos',
        description: 'הבית הדיגיטלי של קהילת הארי פוטר בישראל',
        start_url: '/',
        display: 'standalone',
        background_color: '#020617',
        theme_color: '#d97706',
        icons: [
            {
                src: '/icon-192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/icon-512.png',
                sizes: '512x512',
                type: 'image/png',
            },
        ],
    }
}