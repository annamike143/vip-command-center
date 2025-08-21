// --- Professional SEO Head Component ---
'use client';

import { useEffect } from 'react';

const SEOHead = ({
    title = "VIP Command Center | The Mike Salazar Academy",
    description = "Advanced administrative dashboard for managing VIP students, courses, analytics, and educational platform operations.",
    keywords = "admin dashboard, VIP management, student analytics, course administration, educational platform management",
    canonical = null,
    ogImage = "/og-image-admin.jpg",
    ogType = "website",
    twitterCard = "summary_large_image",
    twitterSite = "@MikeSalazarAcad",
    structuredData = null,
    noIndex = true, // Admin pages should not be indexed
    noFollow = true
}) => {
    // Clean and format title
    const cleanTitle = title.length > 60 ? title.substring(0, 57) + "..." : title;
    const fullTitle = title.includes("Mike Salazar Academy") ? title : `${title} | The Mike Salazar Academy`;
    
    // Clean and format description
    const cleanDescription = description.length > 160 ? description.substring(0, 157) + "..." : description;
    
    // Generate canonical URL
    const canonicalUrl = canonical || (typeof window !== 'undefined' ? window.location.href : '');
    
    // Build robots content
    const robotsContent = `${noIndex ? 'noindex' : 'index'},${noFollow ? 'nofollow' : 'follow'}`;

    useEffect(() => {
        if (typeof window === 'undefined') return;
        
        // Update document title
        document.title = fullTitle;
        
        // Update meta tags
        const updateMetaTag = (name, content, property = false) => {
            if (!content) return;
            const selector = property ? `meta[property="${name}"]` : `meta[name="${name}"]`;
            let meta = document.querySelector(selector);
            if (!meta) {
                meta = document.createElement('meta');
                if (property) {
                    meta.setAttribute('property', name);
                } else {
                    meta.setAttribute('name', name);
                }
                document.head.appendChild(meta);
            }
            meta.setAttribute('content', content);
        };
        
        // Update basic meta tags (admin specific)
        updateMetaTag('description', cleanDescription);
        updateMetaTag('robots', robotsContent);
        updateMetaTag('author', 'The Mike Salazar Academy');
        
    }, [fullTitle, cleanDescription, robotsContent]);

    return null; // This component only manages document head
};

// Pre-built SEO configurations for admin pages
export const seoConfigs = {
    dashboard: {
        title: "Admin Dashboard | VIP Command Center",
        description: "Comprehensive administrative dashboard for managing VIP students, monitoring analytics, and overseeing educational platform operations.",
        keywords: "admin dashboard, VIP management, student analytics, platform administration",
        ogType: "website",
        noIndex: true,
        noFollow: true
    },
    
    students: {
        title: "Student Management | VIP Command Center", 
        description: "Advanced student management interface for VIP member administration, progress tracking, and user analytics.",
        keywords: "student management, VIP users, member administration, progress tracking",
        ogType: "website",
        noIndex: true,
        noFollow: true
    },
    
    analytics: {
        title: "Analytics Dashboard | VIP Command Center",
        description: "Real-time analytics and performance monitoring for the VIP learning platform with comprehensive user insights.",
        keywords: "analytics dashboard, performance monitoring, user insights, platform metrics",
        ogType: "website", 
        noIndex: true,
        noFollow: true
    },
    
    courses: {
        title: "Course Management | VIP Command Center",
        description: "Professional course administration interface for creating, managing, and optimizing VIP educational content.",
        keywords: "course management, content administration, VIP courses, educational content",
        ogType: "website",
        noIndex: true,
        noFollow: true
    },
    
    inbox: {
        title: "Mentorship Inbox | VIP Command Center",
        description: "Advanced communication hub for managing VIP member interactions, support requests, and mentorship activities.",
        keywords: "mentorship inbox, VIP communication, member support, admin messaging",
        ogType: "website",
        noIndex: true,
        noFollow: true
    }
};

// Helper function to generate admin application structured data
export const generateAdminAppStructuredData = () => ({
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "VIP Command Center",
    "description": "Administrative dashboard for managing VIP educational platform operations",
    "applicationCategory": "BusinessApplication",
    "operatingSystem": "Web Browser",
    "provider": {
        "@type": "Organization",
        "name": "The Mike Salazar Academy",
        "url": "https://mikesalazaracademy.com"
    },
    "offers": {
        "@type": "Offer",
        "category": "Administrative Access",
        "availability": "https://schema.org/InStock"
    }
});

export default SEOHead;
