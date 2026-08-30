/* ============================================================
   RIZZ — site-config.js
   Single configuration source for the whole site.
   Company name, contact details, form endpoints and analytics
   hooks all live here, so rebranding later is a one-file change.
   ============================================================ */
window.RIZZ_CONFIG = {
  brand: {
    name: 'RIZZ',
    legalName: 'RIZZ',
    tagline: 'Creators build influence. We build the opportunities.',
    mode: 'Creator Management + Influencer Marketing'
  },
  contact: {
    email: '',
    phone: '',
    socials: {
      youtube: '',
      linkedin: '',
      instagram: '',
      x: ''
    }
  },
  endpoints: {
    creatorApply: '/api/creator-apply',
    campaignInquiry: '/api/campaign-inquiry'
  },
  requestTimeoutMs: 8000,
  fallbackLocalSubmission: true,
  analytics: {
    enabled: true,
    hooks: ['apply_started', 'apply_step_completed', 'apply_submitted',
            'apply_completed', 'campaign_inquiry_submitted']
  }
};