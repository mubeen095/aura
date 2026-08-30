#!/usr/bin/env python3
# =====================================================================
# transform-home.py — rebuilds index.html (SkillGarage home) as the RIZZ
# home page. Pure string surgery on the static Next.js snapshot markup:
# keeps the MUI/emotion design system intact, swaps business identity.
#
# Safe to re-run: idempotent because each needle is asserted to exist.
# =====================================================================
import re, sys

PATH = 'index.html'
s = open(PATH, encoding='utf-8').read()

def R(old, new, n=1):
    '''Replace exactly n occurrences (n=-1 -> all).'''
    global s
    c = s.count(old)
    if n != -1 and c != n:
        print(f'FAIL needle count {c} != {n}: {old[:90]!r}')
        sys.exit(1)
    if c == 0:
        print(f'FAIL needle missing: {old[:90]!r}')
        sys.exit(1)
    s = s.replace(old, new, n if n != -1 else c)

def RM(old):
    '''Remove all occurrences (tolerant).'''
    global s
    s = s.replace(old, '')

def slice_remove(start_hay, end_probe, end_extra=6):
    global s
    a = s.find(start_hay)
    if a == -1:
        return False
    b = s.find(end_probe, a)
    if b == -1:
        print(f'FAIL slice end probe missing after {start_hay[:50]!r}')
        sys.exit(1)
    s = s[:a] + s[b + end_extra:]
    return True

SIDEBAR = '''
<aside class="sidebar" role="complementary" aria-label="Primary">
  <a class="app-brand" href="/" aria-label="RIZZ home">
    <svg width="30" height="30" viewBox="0 0 64 64" aria-hidden="true"><defs><linearGradient id="rzH" x1="0" y1="0" x2="64" y2="64"><stop offset="0" stop-color="#3096FF"/><stop offset="1" stop-color="#0064FF"/></linearGradient></defs><rect x="2" y="2" width="60" height="60" rx="18" fill="url(#rzH)"/><text x="32" y="44" text-anchor="middle" font-family="Inter, Gilroy-SemiBold, sans-serif" font-size="30" font-weight="700" fill="#fff">R</text></svg>
    <span class="app-word">RIZZ</span>
  </a>
  <nav class="side-nav" aria-label="Primary">
    <a href="/" class="on" aria-current="page">HOME</a>
    <a href="/creators.html">CREATORS</a>
    <a href="/brands.html">BRANDS</a>
    <a href="/marketing.html">MARKETING</a>
    <a href="/faqs/index.html">FAQs</a>
  </nav>
  <div class="side-cta">
    <a class="btn btn-blue" href="/register.html">APPLY TO JOIN</a>
    <a class="btn btn-ghost" href="/brands.html#campaign-inquiry">START A CAMPAIGN</a>
  </div>
  <p class="side-foot">CREATE. CONNECT. GET PAID.</p>
</aside>
'''

def inject_sidebar():
    global s
    if '<aside class="sidebar"' in s:
        return
    a = s.find('<body>')
    if a == -1:
        print('FAIL <body> not found for sidebar injection')
        sys.exit(1)
    a += len('<body>')
    s = s[:a] + SIDEBAR + s[a:]

CLICKFX_CSS = '<link rel="stylesheet" href="/originkit-dist/rizz-clickfx.css">'
CLICKFX_BODY = '<div id="rizz-clickfx" aria-hidden="true"></div><script defer src="/originkit-dist/rizz-clickfx.js"></script>'

def inject_clickfx():
    global s
    if 'id="rizz-clickfx"' in s:
        return
    if CLICKFX_CSS not in s:
        s = s.replace('</head>', CLICKFX_CSS + '</head>', 1)
    a = s.rfind('</body>')
    if a == -1:
        print('FAIL </body> not found for clickfx injection')
        sys.exit(1)
    s = s[:a] + CLICKFX_BODY + s[a:]

# Idempotency: if the file was already transformed, run the cleanup
# pass only (strip leftover runtime payloads, then smoke-check).
ALREADY = 'Creators build influence.' in s
if ALREADY:
    slice_remove('<script id="__NEXT_DATA__" type="application/json">', '</script>', 9)
    RM("url('/_next_public/logo/skillgarage-light.svg')")
    if '<body>' not in s and '</html>' in s:
        s = s.replace('</head>', '</head><body>', 1)
    inject_sidebar()
    inject_clickfx()
    open(PATH, 'w', encoding='utf-8').write(s)
    print('CLEANUP PASS DONE — bytes:', len(s))
    sys.exit(0)

# ---------------------------------------------------------------------
# 1. REMOVE tracking + Next.js runtime
# ---------------------------------------------------------------------
# FB pixel script
a = s.find('<script async="" data-next-head="">!function(f,b,e,v,n,t,s)')
b = s.find('</script>', a) + len('</script>')
s = s[:a] + s[b:]
a = s.find('<noscript data-next-head=""><img height="1"')
b = s.find('</noscript>', a) + len('</noscript>')
s = s[:a] + s[b:]

R('<script src="/js/newrelic.js" async="" data-next-head=""></script>', '')
R('<script defer="" type="text/javascript" src="/js/tag-manager.min.js"></script>', '')
R('<noscript data-n-css=""></noscript>', '')

# GTM body noscript (keep the <body> tag)
a = s.find('<noscript><iframe src="https://www.googletagmanager.com/ns.html?id=GTM-NVB7SK2"')
b = s.find('</noscript>', a) + len('</noscript>')
s = s[:a] + s[b:]

# Next.js chunk scripts + sentry meta + collected styles in the head
a = s.find('<script defer="" nomodule="" src="/_next/static/chunks/poly')
b = s.find('</head>', a)
s = s[:a] + s[b:]

# Full-screen "Patience" loader overlay (React-managed; inert without hydration)
a = s.find('<div class="flex h-dvh w-full flex-col items-center justify-center bg-[#060606] fixed top-0 left-0 z-[1700]">')
b = s.find('</div>', s.find('impressed.</p>')) + len('</div>')
s = s[:a] + s[b:]

# ---------------------------------------------------------------------
# 2. HEAD meta
# ---------------------------------------------------------------------
R('<title data-next-head="">Global Community of AI Builders | SkillGarage</title>',
  '<title data-next-head="">RIZZ — Creator Management &amp; Influencer Marketing</title>')
R('<meta name="description" content="A 4-day AI program plus a year of live expert sessions, weekend build events and $7,000 in AI credits. Join the 200,000 builder community." data-next-head=""/>',
  '<meta name="description" content="A creator management and influencer marketing company connecting India\'s creators with ambitious brands." data-next-head=""/>')
R('<link rel="canonical" href="https://skillgarage.in/" data-next-head=""/>', '')
R('<meta property="og:title" content="AI Learning Community for Ambitious Professionals | SkillGarage" data-next-head=""/>',
  '<meta property="og:title" content="RIZZ — Creator Management &amp; Influencer Marketing" data-next-head=""/>')
R('<meta property="og:description" content="A 4-day AI program plus a year of live expert sessions, weekend build events and $7,000 in AI credits. Join the 200,000 builder community." data-next-head=""/>',
  '<meta property="og:description" content="A creator management and influencer marketing company connecting India\'s creators with ambitious brands." data-next-head=""/>')
R('<meta property="og:image" content="https://public-cdn.growthx.club/PAGES/OG_IMAGE/50a42d48fa-33818f94_OG_image_4.png" data-next-head=""/>', '')
R('<meta property="og:url" content="https://skillgarage.in/about" data-next-head=""/>', '<meta property="og:url" content="/" data-next-head=""/>')
R('<meta name="twitter:site" content="@SkillGarage" data-next-head=""/>', '')
R('<meta name="twitter:title" content="AI Learning Community for Ambitious Professionals | SkillGarage" data-next-head=""/>',
  '<meta name="twitter:title" content="RIZZ — Creator Management &amp; Influencer Marketing" data-next-head=""/>')
R('<meta name="twitter:description" content="Learn to build with AI in a week: live sessions, real feedback, and a private builder community. Trusted by professionals worldwide. " data-next-head=""/>',
  '<meta name="twitter:description" content="A creator management and influencer marketing company connecting India\'s creators with ambitious brands." data-next-head=""/>')
R('<meta name="twitter:image" content="https://public-cdn.growthx.club/PAGES/OG_IMAGE/4d7ae43a39-914a0b64_OG_image_4.png" data-next-head=""/>', '')
R('<script type="application/ld+json" data-next-head="">{"@context":"https://schema.org","@graph":[]}</script>',
  '''<script type="application/ld+json" data-next-head="">{"@context":"https://schema.org","@type":"Organization","name":"RIZZ","url":"/","description":"A creator management and influencer marketing company connecting India's creators with ambitious brands.","@graph":[]}</script>''')

# ---------------------------------------------------------------------
# 3. Appbar
# ---------------------------------------------------------------------
R('<img alt="logo" loading="lazy" width="110" height="17" decoding="async" data-nimg="1" src="/_next_public/logo/skillgarage-light.svg" style="color: transparent; object-fit: contain; object-position: center center;">',
  '<img alt="RIZZ" loading="lazy" width="110" height="17" decoding="async" src="/_next_public/logo/rizz.svg" style="color: transparent; object-fit: contain; object-position: center center;">')
R('aria-expanded="false">☰</button>', 'aria-expanded="false" id="rizz-menu-btn">☰</button>')
R('type="button">Become a member</button>', 'type="button" data-href="register.html">JOIN AS CREATOR</button>')

# ---------------------------------------------------------------------
# 4. Hero
# ---------------------------------------------------------------------
R('Build. Compete. Connect. Create.',
  'Creators build influence. We build the opportunities.')
R("India's AI community. Campus hackathons, 200+ colleges, one national finale. Let’s kill it.",
  'We connect India’s creators with brands that want authentic content — and handle the business so you can keep creating.')
R('>Become a member</a>', '>JOIN AS CREATOR</a>')
R('Trusted by builders at', 'Brand categories we ship')

# hero partner logos -> category wordmarks (24 imgs: 8 x 3 scroll copies)
def logofix(m):
    cats = ['TECH','BEAUTY','FASHION','E-COMMERCE','FOOD & DRINK','GAMING','ENTERTAINMENT','HEALTH']
    out = '<span class="rizz-wordmark">' + cats[logofix.i % len(cats)] + '</span>'
    logofix.i += 1
    return out
logofix.i = 0
pat = re.compile(r'<img src="https://public-cdn\.growthx\.club/media/homepage_feb_26/company-logos/[^"]*" alt="[^"]*"[^>]*/>')
s, n = pat.subn(logofix, s)
if n != 24:
    print(f'FAIL company logos replaced: {n} != 24'); sys.exit(1)

# ---------------------------------------------------------------------
# 5. Loop section -> how the network works
# ---------------------------------------------------------------------
R('This ain’t a course.', 'Being a creator shouldn’t mean being your own agency.')
R('But it’s a loop you keep running as your goals change.', 'You create. We handle the business.')
R('>Select your goal<', '>Join the network<')
R('>Better role, shipped product, network, or a new skill<', '>Apply once. Tell us who you are, what you make, where you’re headed.<')
R('>Get your roadmap<', '>Get matched<')
R('>Who to meet<br/>What to learn<br/>What to build<', '>Brand campaigns that actually fit your content, niche and audience.<')
R('>Repeat<', '>Grow long-term<')
R('>Hit it, pick the next one; every loop compounds<', '>Deals, deliveries and payments handled — you keep creating.<')

# band: brands we'd love to work with (inserted before the ladder section)
BRANDS_BAND = ('<div style="background:#060606;padding:64px 24px;text-align:center">'
  '<p style="font-family:DM Mono, ui-monospace, monospace;font-size:12px;letter-spacing:3px;text-transform:uppercase;color:#8b8f96;margin:0 0 18px">Brands we’d love to work with</p>'
  '<p style="font-family:Gilroy-Bold;font-weight:400;font-size:28px;line-height:1.5;letter-spacing:-0.02em;color:#fff;margin:0;max-width:1000px;margin-left:auto;margin-right:auto">'
  'Mamaearth · SUGAR · Lakmé · Uber · boAt · Nykaa · Wakefit · Plum · The Derma Co. · Foxtale · Minimalist</p></div>')
anchor = '<section class="MuiBox-root mui-amxga5" id="ai-product-ladder-section">'
if anchor not in s:
    print('FAIL ladder anchor missing'); sys.exit(1)
s = s.replace(anchor, BRANDS_BAND + anchor, 1)

# ---------------------------------------------------------------------
# 6. Ladder -> creator pain points
# ---------------------------------------------------------------------
R('In <!-- -->3<!-- --> days, build &amp; sell your first AI product.',
  'Being a creator is creative. The business is the grind.')
for i, lbl in enumerate(['PAIN 01','PAIN 02','PAIN 03','PAIN 04','PAIN 05'], 1):
    R(f'>LEVEL {i}<', f'>{lbl}<', 2)
R('<span class="MuiBox-root mui-1gs2yau">The </span>', '<span class="MuiBox-root mui-1gs2yau"></span>', -1)
R('>user</span>', '>Finding deals</span>', 2)
R('>vibe coder</span>', '>Negotiation</span>', 2)
R('>automator</span>', '>Campaign management</span>', 2)
R('>coder</span>', '>Payments</span>', 2)
R('>AI first leader</span>', '>Growth</span>', 2)

R('You use ChatGPT or Claude every day. You have <span class="MuiBox-root mui-jh7vwo">never written code</span>. This is where most people start.',
  'Brands don’t knock twice. The best opportunities slip while you DM and pray.', 2)
R('You have shipped something with a <span class="MuiBox-root mui-jh7vwo">vibe coding tool</span>. Lovable, Bolt, Emergent.',
  'Brands lowball creators who don’t know their worth. We fix that.', 2)
R('You have built an <span class="MuiBox-root mui-jh7vwo">AI workflow or agent</span>. <br/>n8n, Make.',
  'Briefs, timelines, revisions, deliverables — alone they eat your week.', 2)
R('You use <span class="MuiBox-root mui-jh7vwo">Claude Code</span> to ship a full deployed product. Frontend, backend, database, live URL, public repo.',
  'You posted. The invoice is late. The follow-ups take forever.', 2)
R('You <span class="MuiBox-root mui-jh7vwo">build and you distribute</span>. Product, users, traction. You stop waiting on anyone to ship your ideas.',
  'Your next milestone isn’t likes. It’s a real, paying career.', 2)

# cohort CTA band
R('Next cohort begins <!-- -->August 29th', 'Applications are open. Across India.')
R('type="button">Explore detailed curriculum</button>',
  'type="button" data-href="register.html">JOIN AS CREATOR</button>')

def rm_ticker():
    global s
    a = s.find('<div class="MuiBox-root mui-10446jc">')
    if a == -1:
        print('FAIL marquee track block not found')
        sys.exit(1)
    b = s.find('</section>', a)
    if b == -1 or s[b - 12:b] != '</div></div>':
        print('FAIL marquee track end not matched')
        sys.exit(1)
    s = s[:a] + s[b - 12:]

# ---------------------------------------------------------------------
# 7. Cities / languages band (keep heading + languages, drop meetup ticker)
# ---------------------------------------------------------------------
R('Lunch,<!-- --> <br class="MuiBox-root mui-5eoz9k"/>brunch, bakar.<br/>In 18 states in India.',
  'Creators across India.<br class="MuiBox-root mui-5eoz9k"/> In every language India speaks.')
R('Bengaluru, Mumbai, Delhi, Hyderabad, Chennai,<!-- --> <br class="MuiBox-root mui-5eoz9k"/>Pune, Kolkata &amp; more',
  'Hindi, English, Telugu, Tamil, Kannada,<!-- --> <br class="MuiBox-root mui-5eoz9k"/>Malayalam, Marathi, Bengali, Gujarati, Punjabi &amp; more')
rm_ticker()

# ---------------------------------------------------------------------
# 8. Credits band -> WHAT CREATORS GET
# ---------------------------------------------------------------------
R('<img class="MuiBox-root mui-v9c39z" src="/_next_public/logo/skillgarage-light.svg" alt="SkillGarage"/>',
  '<img class="MuiBox-root mui-v9c39z" src="/_next_public/logo/rizz.svg" alt="RIZZ"/>')
R('AI credits to build things', 'WHAT CREATORS GET')
R('$7,000 when you sign up + more during campus hackathons',
  'Everything a creator needs to turn reach into revenue.')

CARD_CONTENT = {
    'sarvam-ai':  ('01', 'Brand opportunities', 'Real brand deals matched to your content.'),
    'wispr-flow': ('02', 'Better negotiation', 'Rates grounded in data, not guesswork.'),
    'notion':     ('03', 'Campaign management', 'Briefs, deliverables and timelines — handled.'),
    'openai':     ('04', 'Payment transparency', 'Clear terms. Clear timelines. On-time payouts.'),
    'elevenlabs': ('05', 'Long-term growth', 'Programmatic deals that compound over time.'),
    'ringg-ai':   ('06', 'India-wide network', 'Creators across every region and language.'),
}
card_pat = re.compile(
    r'<div class="MuiBox-root mui-1etgcpn"><img class="[^"]*" src="https://public-cdn\.growthx\.club/media/homepage_feb_26/credits/(sarvam-ai|wispr-flow|notion|openai|elevenlabs|ringg-ai)\.webp" alt="[^"]*"/></div><p class="MuiTypography-root MuiTypography-body1 mui-jbyix4">[^<]*</p>')
def cardfix(m):
    num, title, sub = CARD_CONTENT[m.group(1)]
    return ('<div class="MuiBox-root mui-1etgcpn"><span class="rizz-card-num">' + num +
            '</span></div><p class="MuiTypography-root MuiTypography-body1 mui-jbyix4">' + title +
            '</p><p class="rizz-card-sub">' + sub + '</p>')
s, n = card_pat.subn(cardfix, s)
if n != 6:
    print(f'FAIL credits cards replaced: {n} != 6'); sys.exit(1)

# ---------------------------------------------------------------------
# 9. Festival band -> find creators
# ---------------------------------------------------------------------
R('SKILLGARAGE 2026 — NATIONAL HACKATHON + AI BOOTCAMP', 'FOR BRANDS')
R('₹1,200. EVERYTHING.', 'FIND CREATORS<br/>PEOPLE ACTUALLY TRUST.')
R('The price of round 1 of the national hackathon. No tiers, no hidden fees — the bootcamp, the hackathon, goodies, the certificate, ₹20 lakh prize eligibility and the music festival: all in.',
  'We help brands discover, activate and measure creators across India — matched by content, category, language and audience quality, not follower counts.')
R('<a href="/events" style="display:inline-block;background:#0057DE;color:#fff;border-radius:100px;padding:15px 32px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px;letter-spacing:.03em">REGISTER — ROUND 1</a>',
  '<a href="brands.html" style="display:inline-block;background:#0057DE;color:#fff;border-radius:100px;padding:15px 32px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px;letter-spacing:.03em">START A CAMPAIGN</a>')
R('<a href="/pricing" style="display:inline-block;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:100px;padding:14px 30px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">SEE PRICING</a>',
  '<a href="brands.html" style="display:inline-block;color:#fff;border:1px solid rgba(255,255,255,.4);border-radius:100px;padding:14px 30px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">TALK TO US</a>')
R('<a href="/faqs" style="display:inline-block;color:#f0b429;border-radius:100px;padding:14px 20px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">ALL 25 FAQS</a>',
  '<a href="faqs/index.html" style="display:inline-block;color:#f0b429;border-radius:100px;padding:14px 20px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">MORE FAQS</a>')
R('<span>₹1,200 / ROUND 1</span>', '<span>CREATOR-FIRST</span>')
R('<span>4 DAYS ON CAMPUS</span>', '<span>TRANSPARENT</span>')
R('<span>TEAMS OF 4</span>', '<span>INDIA-WIDE</span>')
R('<span>₹20 LAKH IN PRIZES</span>', '<span>AUDIENCE QUALITY</span>')

# how-we-work band
R('THE FESTIVAL', 'HOW WE WORK')
R('AI is the main course.', 'Creator campaigns, handled end to end.')
R('Three days on campus. One main course — AI — plus entrepreneurship and networking streams, buildathons, a music festival and ₹20 lakh in prizes. The best of India, one campus.',
  'From discovery to payment, one team runs the campaign. We match the right creators, brief them, manage deliveries and report what actually mattered.')
R('<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">AI BOOTCAMP</span>',
  '<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">DISCOVER</span>')
R('<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">ENTREPRENEURSHIP STREAM</span>',
  '<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">MATCH</span>')
R('<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">NETWORKING STREAM</span>',
  '<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">ACTIVATE</span>')
R('<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">MUSIC FESTIVAL</span>',
  '<span style="border:1px solid rgba(255,255,255,.25);border-radius:100px;padding:9px 18px;font-family:DM Mono, ui-monospace, monospace;font-size:11px;letter-spacing:2px;color:#fff">MEASURE</span>')
R('<a href="/learn" style="font-family:Gilroy-Bold;font-size:15px;color:#f0b429;text-decoration:none;border-bottom:1px solid rgba(240,180,41,.4);padding-bottom:2px">EXPLORE THE BOOTCAMP →</a>',
  '<a href="creators.html" style="font-family:Gilroy-Bold;font-size:15px;color:#f0b429;text-decoration:none;border-bottom:1px solid rgba(240,180,41,.4);padding-bottom:2px">MEET THE NETWORK →</a>')

# ---------------------------------------------------------------------
# 10. FAQ band
# ---------------------------------------------------------------------
R('id="skillgarage-faqs"', 'id="rizz-faqs"')
FAQ = [
    ('Is ₹1,200 really the whole price?',
     'How much commission does RIZZ take?',
     "Yes — and it's the price of round 1 of the national hackathon. No tiers, no add-on passes, no hidden fees. Hackathon round 1, the community, goodies, certificate, prize eligibility and the music fest — all inside the ₹1,200.",
     'Decided upfront, in writing, before any campaign. No hidden cuts and no surprise deductions after you deliver.'),
    ('Who can register?',
     'Who can join the creator network?',
     "Any student — undergrad, postgrad or just graduated this year. You don't need to be from a CS background, and there's no entrance test or degree requirement.",
     'Anyone making content — any niche, any city, any size. You don’t need a follower count to apply; we look at content quality and audience fit.'),
    ("What's the refund policy?",
     'Is joining locked into a contract?',
     "No refunds after payment — the kit, credits and infrastructure are bought in advance for every seat. Pick your dates carefully; if something genuinely blocks you, mail us and we'll look at it case by case.",
     'No lock-in that forces you into brand work. You stay in control and approve every campaign before it starts.'),
    ('How does the national hackathon work?',
     'How do brand opportunities get matched?',
     "Your registration puts you in round 1, which runs at the festival. Round 1 uses a 12-point system: at least one member of your 4-person team must qualify, and every other member needs a minimum 6/12 points to stay on the team. Show up, build, clear the line, and advance — the higher rounds scale up from there.",
     'You tell us your categories, languages and audience. Brands tell us what they need. We match the two — and only pitch you campaigns that fit.'),
    ("What's the team size?",
     'Do I have to work with any brand that comes my way?',
     "Teams of up to 4. To qualify in round 1, at least one member must qualify and the rest need a minimum 6/12 points to remain on the team. Competing solo is allowed if you're built different — but squads are where the fun (and the prizes) live.",
     'Never. You review the brief, usage and payment terms before anything starts. If it’s not right, you skip it — no penalties.'),
    ('How does the 6/12 points thing work?',
     'When do creators get paid?',
     "Every member of your 4-person team gets scored out of 12 in round 1. For the team to qualify, at least one of you must hit the qualifying mark — and anyone below 6/12 drops out of the team. Everyone above the line stays and the team carries on.",
     'Payment terms are set before the campaign and settled on time — every time. We chase so you can create.'),
    ("I'm not studying CS. Can I still compete?",
     'I’m new and my audience is small. Is this for me?',
     "Absolutely. Some of the best projects at festival hackathons come from design, business and even sports students. The bootcamp gets you up to speed on day 1.",
     'Yes. Brands across India look for niche creators with engaged audiences — not just big follower counts. That’s exactly who we platform.'),
    ('Do I need to bring my own laptop?',
     'Which niches and languages do you cover?',
     "Yes — a working laptop is the one thing we don't provide. Power, internet, space and mentors we've got covered.",
     'Music, food, tech, beauty, fashion, gaming, travel, fitness and more — across Hindi, English and India’s major regional languages.'),
    ('What if I don\'t have a project idea yet?',
     'I’m a brand. How do I start a campaign?',
     "That's the point of the bootcamp. You'll walk in with zero ideas and walk out with at least one shipped thing worth hacking further.",
     'Start a campaign and tell us your goal. We’ll bring vetted creators, a clear plan and transparent pricing before you commit.'),
    ('What exactly is the bootcamp?',
     'How do you measure campaign success?',
     "Three days on campus, inside the festival. One main course — AI — plus networking and entrepreneurship streams. Small squads, hands-on, mentors from the industry.",
     'Impressions, engagement, reach, saves, view-throughs and conversions where trackable — reported plainly, no vanity metrics.'),
]
for i, (oldq, newq, olda, newa) in enumerate(FAQ):
    R('>' + oldq + '<', '>' + newq + '<', -1)
    R('>' + olda + '<', '>' + newa + '<', -1)

R('<a href="/faqs" style="font-family:Gilroy-Bold;font-size:15px;color:#f0b429;text-decoration:none;border-bottom:1px solid rgba(240,180,41,.4);padding-bottom:2px">ALL 25 FAQS →</a>',
  '<a href="faqs/index.html" style="font-family:Gilroy-Bold;font-size:15px;color:#f0b429;text-decoration:none;border-bottom:1px solid rgba(240,180,41,.4);padding-bottom:2px">MORE FAQS →</a>')
R('<a href="/events" style="display:inline-block;background:#0057DE;color:#fff;border-radius:100px;padding:14px 28px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">REGISTER — ROUND 1</a>',
  '<a href="register.html" style="display:inline-block;background:#0057DE;color:#fff;border-radius:100px;padding:14px 28px;text-decoration:none;font-family:Gilroy-Bold;font-size:15px">JOIN AS CREATOR</a>')

# ---------------------------------------------------------------------
# 11. Footer rebuild
# ---------------------------------------------------------------------
FOOTER = '''<footer class="MuiBox-root mui-1a6zsvq">
<div class="MuiBox-root mui-1f6b1xz">
<div class="MuiBox-root mui-0">
<p class="MuiTypography-root MuiTypography-body1 mui-9uxgn4">Creators</p>
<div class="MuiBox-root mui-au43w">
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/creators.html">Join the network</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/register.html">Apply to join</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/faqs/index.html">Creator FAQs</a>
</div>
</div>
<div class="MuiBox-root mui-0">
<p class="MuiTypography-root MuiTypography-body1 mui-9uxgn4">Brands</p>
<div class="MuiBox-root mui-au43w">
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/brands.html">Start a campaign</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/marketing.html">Marketing services</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/faqs/index.html">Brand FAQs</a>
</div>
</div>
<div class="MuiBox-root mui-0">
<p class="MuiTypography-root MuiTypography-body1 mui-9uxgn4">Company</p>
<div class="MuiBox-root mui-mz17s3">
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/marketing.html">Marketing</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/terms.html">Terms of use</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_self" rel="" href="/privacy.html">Privacy policy</a>
</div>
</div>
<div class="MuiBox-root mui-0">
<p class="MuiTypography-root MuiTypography-body1 mui-9uxgn4">Contact</p>
<div class="MuiBox-root mui-mz17s3" data-contact-block="">
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" data-contact="email" data-contact-label="true" href="#">hello@rizz.in</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" data-contact="phone" data-contact-label="true" href="#">+91 00000 00000</a>
</div>
</div>
<div class="MuiBox-root mui-0">
<p class="MuiTypography-root MuiTypography-body1 mui-9uxgn4">Socials</p>
<div class="MuiBox-root mui-mz17s3" data-contact-block="">
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_blank" rel="noopener noreferrer" data-social="youtube" href="#">YouTube</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_blank" rel="noopener noreferrer" data-social="instagram" href="#">Instagram</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_blank" rel="noopener noreferrer" data-social="linkedin" href="#">LinkedIn</a>
<a class="MuiTypography-root MuiTypography-inherit MuiLink-root MuiLink-underlineHover mui-ykpck3" target="_blank" rel="noopener noreferrer" data-social="x" href="#">X (Twitter)</a>
</div>
</div>
</div>
<div class="MuiBox-root mui-1naw4c4">
<p class="MuiTypography-root MuiTypography-body1 mui-bkr8iv">Copyright <span data-year="true">2026</span> © RIZZ</p>
</div>
</footer>'''
a = s.find('<footer class="MuiBox-root mui-1a6zsvq">')
b = s.find('</footer>', a) + len('</footer>')
s = s[:a] + FOOTER + s[b:]

# ---------------------------------------------------------------------
# 12. Scripts before </head>
# ---------------------------------------------------------------------
R('</head>', '<script src="/js/site-config.js"></script>\n<script src="/js/brand.js" defer=""></script>\n<script src="/js/home.js" defer=""></script>\n</head>', 1)

# ---------------------------------------------------------------------
# 12b. Strip __NEXT_DATA__ CMS payload + old-logo CSS background
# ---------------------------------------------------------------------
a = s.find('<script id="__NEXT_DATA__" type="application/json">')
b = s.find('</script>', a) + len('</script>')
s = s[:a] + s[b:]
R("url('/_next_public/logo/skillgarage-light.svg')", "url('/_next_public/logo/rizz.svg')", -1)

# ---------------------------------------------------------------------
# 13. Smoke checks
# ---------------------------------------------------------------------
inject_sidebar()
inject_clickfx()
open(PATH, 'w', encoding='utf-8').write(s)
print('OK — bytes:', len(s))
bad = []
for probe in ['SkillGarage', 'skillgarage', 'SKILLGARAGE', 'googletagmanager', 'GTM-NVB7SK2',
              'newrelic', 'tag-manager', '__NEXT_DATA__', 'Become a member',
              'Patience—you', 'fbq', '₹1,200', 'LEVEL 1', 'The user', 'vibe coder',
              '6/12', 'NATIONAL HACKATHON', 'ROUND 1', '20 LAKH', 'AI BOOTCAMP', 'MUSIC FESTIVAL']:
    if probe in s:
        bad.append(probe)
if bad:
    print('LEFTOVERS:', bad)
    sys.exit(1)
print('SMOKE CHECKS PASSED')