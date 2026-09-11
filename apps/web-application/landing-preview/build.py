"""Build the static Stage website from the reviewed copy and supplied assets."""
from pathlib import Path
import json
import re
from hashlib import sha256
from html import escape

ROOT = Path(__file__).parent
DIST = ROOT.parent / 'public' / 'landing-preview'
CONTENT = json.loads((ROOT / 'content.json').read_text())
PROBLEM = json.loads((ROOT / 'problem-content.json').read_text())
S = {s['number']: s for s in CONTENT['sections']}
ICON_INSTANCE = 0

def version_assets(markup):
    """Reload changed CSS and scripts even when the browser keeps older assets."""
    def replace(match):
        attr, asset = match.groups()
        version = sha256((DIST / asset).read_bytes()).hexdigest()[:12]
        return f'{attr}="/{asset}?v={version}"'
    markup = re.sub(r'(src|href)="/([^"?]+\.(?:css|js))"', replace, markup)
    return re.sub(r'((?:src|href|poster)=")/(?!/)', r'\1/landing-preview/', markup)

def icon(name, cls='icon'):
    global ICON_INSTANCE
    ICON_INSTANCE += 1
    svg = (DIST / 'assets' / 'icons' / (name + '.svg')).read_text()
    svg = re.sub(r'<\?xml[^>]*\?>', '', svg)
    # Namespace only IDs and their references. Short IDs such as "a" must
    # never replace letters inside SVG tags, path data, or colour values.
    ids = {value: f'{value}-{ICON_INSTANCE}' for value in re.findall(r'\bid="([^"]+)"', svg)}
    svg = re.sub(r'\bid="([^"]+)"', lambda m: f'id="{ids[m[1]]}"', svg)
    svg = re.sub(r'url\(#([^)]+)\)', lambda m: f'url(#{ids.get(m[1], m[1])})', svg)
    svg = re.sub(r'((?:xlink:)?href=")#([^"]+)(")', lambda m: f'{m[1]}#{ids.get(m[2], m[2])}{m[3]}', svg)
    return svg.replace('<svg ', f'<svg class="{cls}" aria-hidden="true" ', 1)

def download(label='Download for Mac', cls='button button-primary'):
    return f'<a class="{cls}" href="/download/">{icon("apple")}<span>{label}</span></a>'

def head(title, description, extra=''):
    return f'''<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#f5f5f5"><title>{escape(title)}</title><meta name="description" content="{escape(description)}"><link rel="icon" href="/assets/stage-logo.png"><link rel="preload" as="font" href="/assets/fonts/InterVariable.woff2" type="font/woff2" crossorigin><link rel="stylesheet" href="/styles.css"><link rel="stylesheet" href="/sections.css"><link rel="stylesheet" href="/navigation.css"><link rel="stylesheet" href="/experience.css"><link rel="stylesheet" href="/mobile.css">{extra}</head>'''

def label(number, name, glyph):
    return f'<div class="section-label">{icon(glyph)}<span>{name}</span></div>'

def copy(number, cls='section-copy'):
    s=S[number]
    return f'<div class="{cls}"><h2 class="section-headline">{s["headline"]}</h2><p>{s["body"]}</p></div>'

def footer():
    anchors=''.join(f'<a href="/#{c["href"][1:]}">{c["label"]}</a>' for c in CONTENT['navigation']['cards'])
    return f'''<footer class="site-footer"><div class="footer-main"><div class="footer-brand"><a href="/" aria-label="Stage home">{icon('stage-symbol','brand-symbol')}<span>Stage</span></a><p>Stage does the thinking.<br>Your AI does the building.</p></div><div class="footer-column"><span>Product</span>{anchors}</div><div class="footer-column"><span>Stage</span><a href="/#pricing">Pricing</a><a href="/#faq">FAQ</a><button data-destination="login">Log in</button><button data-destination="legal">Legal</button><a href="mailto:hello@getstage.co">Contact</a><a href="https://www.instagram.com/getstage.co/" target="_blank" rel="noopener noreferrer">Instagram</a></div></div><div class="footer-bottom"><span>© Stage. 2026. All rights reserved</span></div></footer>'''

def dialog():
    return '''<dialog id="destination-dialog"><button class="dialog-close" aria-label="Close dialog">×</button><p class="eyebrow">Stage preview</p><h2 id="destination-title"></h2><p id="destination-message"></p><button class="button button-neutral dialog-done">Got it</button></dialog>'''

names=['AGENTS.md','Research','Strategy','Moodboard','Flows','Wireframes','Style guide']
nav_icons=['search','moodboard','flows','skills','share','components']
nav_cards=''.join(f'<a class="menu-card" href="{c["href"]}"><span class="menu-icon">{icon(glyph)}</span><strong>{c["label"]}</strong><p><span class="menu-copy-compact">{c["description"]}</span><span class="menu-copy-expanded">{c["expandedDescription"]}</span></p></a>' for c,glyph in zip(CONTENT['navigation']['cards'],nav_icons))
nav=f'''<a class="skip-link" href="#main">Skip to content</a><header class="navigation" id="navigation"><div class="nav-row"><a class="nav-brand" href="#top" aria-label="Stage home">{icon('stage-symbol','brand-symbol')}<span class="nav-mobile-name" aria-hidden="true">Stage</span></a><button class="product-toggle" id="product-toggle" aria-expanded="false" aria-controls="product-menu" aria-label="Open product menu"><span class="product-toggle-label">Product</span> {icon('chevron-down')}<span class="mobile-menu-icon" aria-hidden="true"></span></button><a class="nav-link" href="#pricing">Pricing</a><a class="nav-link" href="#faq">FAQ</a><span class="nav-spacer"></span><button class="nav-link login-link" data-destination="login">Log in</button>{download('Download','nav-download')}</div><div class="product-menu" id="product-menu" hidden><p class="mobile-menu-heading">Features</p>{nav_cards}<div class="mobile-menu-links"><a href="#pricing">Pricing</a><a href="#faq">FAQ</a><button data-destination="login">Log in</button></div></div></header>'''


hero=f'''<section class="hero hero-landscape" id="top" aria-label="Stage for macOS"><div class="hero-sky" aria-hidden="true"></div><div class="landscape-layer landscape-far" data-parallax="0.31" aria-hidden="true"><img src="/assets/stage-landscape-far.png" alt="" width="1944" height="809"></div><div class="landscape-layer landscape-mid" data-parallax="0.17" aria-hidden="true"><img src="/assets/stage-landscape-mid.png" alt="" width="1862" height="845"></div><div class="hero-heading"><h1 aria-label="Stage does the thinking. Your AI does the building.">Stage does the thinking.<br><span>Your AI does the building.</span></h1><p class="hero-description">{S[1]['body']}</p>{download(escape(S[1]['primaryCta']), cls='button button-primary hero-cta')}<p class="cta-caption">{S[1]['microcopy']}</p></div><figure class="hero-dashboard" data-parallax="0.20"><div class="hero-dashboard-screen"><img src="/assets/stage-dashboard-hover.png?v=89446ea8d32d" alt="Stage dashboard showing projects, tasks, activity and the hovered project chart" width="2880" height="2628" fetchpriority="high"></div><figcaption class="screen-reader-only">The Stage dashboard from the product design.</figcaption></figure><div class="landscape-layer landscape-front" aria-hidden="true"><img src="/assets/stage-landscape-front.png" alt="" width="2038" height="771"></div><div class="hero-ground" aria-hidden="true"></div></section>'''

def reading_paragraph(paragraph):
    text = paragraph['text']
    visuals = {}
    for visual in paragraph['inlineVisuals']:
        end = text.index(visual['after']) + len(visual['after'])
        if visual['type'] == 'infographic':
            markup = f'<span class="inline-prompt">{icon("documents")}<span>Build my idea.</span><i></i></span>'
        else:
            markup = f'<span class="inline-decision">{icon(visual["icon"].lower())}</span>'
        visuals[end] = markup
    tokens = []
    for match in re.finditer(r'\S+', text):
        word = f'<span class="reading-word">{escape(match.group())}</span>'
        visual = visuals.get(match.end())
        tokens.append(f'<span class="reading-cluster">{word}{visual}</span>' if visual else word)
    words = ' '.join(tokens)
    return f'<p class="problem-paragraph" data-reading><span class="screen-reader-only">{escape(text)}</span><span aria-hidden="true">{words}</span></p>'

launch_video=f'''<figure class="launch-video" id="launch-video" aria-label="{escape(PROBLEM['launchVideo']['title'])}"><div class="launch-video-player" data-launch-player data-state="paused"><video id="stage-launch-film" data-launch-film controls controlslist="nofullscreen" playsinline preload="none" poster="{escape(PROBLEM['launchVideo']['posterUrl'])}" width="1920" height="1080" tabindex="0" aria-label="{escape(PROBLEM['launchVideo']['title'])}" aria-describedby="launch-video-help"><source src="{escape(PROBLEM['launchVideo']['videoUrl'])}" type="video/mp4"></video><span class="screen-reader-only" id="launch-video-help">Press Space to play or pause. Use the left and right arrow keys to seek.</span><button class="launch-video-control launch-video-play" data-video-play type="button" aria-controls="stage-launch-film" aria-label="Play video" hidden><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 4.6c0-1.1 1.2-1.8 2.1-1.2l12 7.4c.9.5.9 1.9 0 2.4l-12 7.4c-.9.6-2.1-.1-2.1-1.2Z" fill="currentColor"/></svg></button><button class="launch-video-control launch-video-replay" data-video-replay type="button" aria-controls="stage-launch-film" aria-label="Replay video from the beginning" hidden><span>Replay</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5v5h5M5.8 9a8 8 0 1 1-.1 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg></button><button class="launch-video-control launch-video-sound" data-video-sound type="button" aria-controls="stage-launch-film" aria-label="Mute video" aria-pressed="false" hidden><svg data-video-icon="sound" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor"/><path d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg><svg data-video-icon="muted" viewBox="0 0 24 24" aria-hidden="true"><path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor"/><path d="m17 9 5 6m0-6-5 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg></button><p class="launch-video-error" data-video-error role="status" hidden></p></div></figure>'''
shift=f'''<section class="problem-story" id="shift" aria-labelledby="problem-title"><div class="problem-inner"><div class="problem-copy"><h2 class="screen-reader-only" id="problem-title">Before the build</h2>{reading_paragraph(PROBLEM['paragraphs'][0])}{reading_paragraph(PROBLEM['paragraphs'][1])}</div>{launch_video}<div class="problem-copy">{reading_paragraph(PROBLEM['paragraphs'][2])}</div><div class="problem-outro" id="stage-transition" aria-hidden="true">{icon('stage-symbol','problem-outro-logo')}</div></div></section>'''

research_benefits=''.join(f'<li><span class="research-check">{icon("tick")}</span><span>{escape(benefit)}</span></li>' for benefit in S[3]['benefits'])
research=f'''<section class="research section-shell feature" id="research" aria-labelledby="research-heading"><figure class="research-visual"><div class="research-backdrop"><div class="research-mockup"><div class="research-page-scroll" tabindex="0" role="region" aria-label="Stage research page" aria-describedby="research-scroll-help" data-lenis-prevent><img src="/assets/stage-research-frame-66.png" alt="Stage research page showing the research summary, company snapshot, competitive analysis, UI patterns, target users and opportunities" loading="lazy" decoding="async" draggable="false" width="2468" height="5797"></div></div></div><figcaption class="screen-reader-only" id="research-scroll-help">Scroll inside the mockup to explore the complete research page. Use the arrow keys or Page Down when focused. Original Stage research page from the supplied Frame 66 image.</figcaption></figure><div class="research-copy">{label(1,'Research','search')}<h2 class="section-headline" id="research-heading">{escape(S[3]['headline'])}</h2><ul class="research-benefits" role="list">{research_benefits}</ul></div></section>'''


moodboard_references = [
    ('website', 'moodboard-reference-website.png', 'A website design reference from the supplied Stage moodboard', 1920, 1320),
    ('mobile', 'moodboard-reference-mobile.jpg', 'Linear mobile Inbox design reference', 1290, 2796),
    ('webapp', 'moodboard-reference-webapp.png', 'A web app dashboard reference from the supplied Stage design', 2732, 1642),
]
reference_cards=''.join(f'''<figure class="moodboard-reference reference-{kind}"><div class="reference-capture"><img src="/assets/{asset}" alt="{alt}" width="{width}" height="{height}" loading="lazy"></div></figure>''' for kind,asset,alt,width,height in moodboard_references)
moodboard=f'''<section class="moodboard feature" id="moodboard"><div class="section-shell"><div class="moodboard-header">{label(2,'Moodboard','moodboard')}{copy(4)}</div>
<div class="moodboard-flow" data-moodboard-flow>
  <div class="moodboard-input">
    <div class="reference-collage">
      {reference_cards}
      <div class="moodboard-options" role="img" aria-label="Reference options: Pull references, Figma Import, and Upload from Device.">
        <span class="moodboard-option option-ai" aria-hidden="true">{icon('moodboard-sparkles')}<span>Pull references</span></span>
        <span class="moodboard-option option-figma" aria-hidden="true">{icon('moodboard-figma')}<span>Figma Import</span></span>
        <span class="moodboard-option option-upload" aria-hidden="true">{icon('moodboard-upload')}<span>Upload from Device</span></span>
      </div>
    </div>
  </div>
  <div class="moodboard-connection" aria-hidden="true">
    <div class="moodboard-beam">
      <span class="beam-field"></span>
      <svg class="beam-filaments" viewBox="0 0 180 200" fill="none" preserveAspectRatio="none">
        <defs>
          <linearGradient id="moodboard-beam-violet" x1="0" y1="100" x2="180" y2="100" gradientUnits="userSpaceOnUse">
            <stop stop-color="#463fba" stop-opacity="0"/>
            <stop offset=".3" stop-color="#7b76df" stop-opacity=".5"/>
            <stop offset="1" stop-color="#7b76df"/>
          </linearGradient>
          <linearGradient id="moodboard-beam-white" x1="0" y1="100" x2="180" y2="100" gradientUnits="userSpaceOnUse">
            <stop stop-color="#e7e6fd" stop-opacity="0"/>
            <stop offset=".42" stop-color="#e7e6fd" stop-opacity=".75"/>
            <stop offset="1" stop-color="#ffffff"/>
          </linearGradient>
        </defs>
        <path class="beam-filament-outer" d="M0 100H119C154 100 168 94 174 57L180 22M119 100C154 100 168 106 174 143L180 178"/>
        <path class="beam-filament-inner" d="M0 100H139C164 100 174 93 180 65M139 100C164 100 174 107 180 135"/>
        <path class="beam-filament-body" d="M0 100H180"/>
        <path class="beam-filament-core" d="M0 100H180"/>
      </svg>
      <span class="beam-flight-lane"><span class="beam-flight"></span></span>
      <span class="beam-arrival"></span>
    </div>
  </div>
  <div class="moodboard-output">
    <figure class="moodboard-guide" id="moodboard-style-guide" aria-label="Style guide preview with atmosphere, colour palette, typography and components from the supplied Stage design">
      <div class="guide-toolbar">{icon('documents')}<span>Style guide</span><span class="guide-direction">Direction 1</span></div>
      <div class="guide-page">
        <div class="guide-page-heading"><div><h3>Style guide</h3><p>Brand handbook for your project</p></div><span class="guide-ready">{icon('tick')}</span></div>
        <div class="guide-block guide-atmosphere"><img src="/assets/style-atmosphere.png" alt="Atmosphere: density, variance and motion" width="2154" height="150" loading="lazy"></div>
        <div class="guide-block guide-palette"><img src="/assets/style-palette.png" alt="Colour palette with warning, error and success ramps" width="2154" height="318" loading="lazy"></div>
        <div class="guide-block guide-type"><img src="/assets/style-typography.png" alt="Inter typography scale and font weights" width="2154" height="1082" loading="lazy"></div>
        <div class="guide-block guide-components"><span>Components</span><div><span class="guide-button-preview">Button</span><span class="guide-button-preview secondary">Button</span><span class="guide-button-preview outline">Button</span></div></div>
      </div>
    </figure>
  </div>
</div>
</div></section>'''


flows_benefits=''.join(f'<li><span class="flows-check">{icon("tick")}</span><span>{escape(benefit)}</span></li>' for benefit in S[5]['benefits'])
flow_steps=''.join(f'<li class="flow-step"><span class="flow-step-number" aria-hidden="true">{i}</span><div class="flow-step-copy"><span class="flow-step-screen">{escape(step["screen"])}</span><span class="flow-step-action">{escape(step["action"])}</span></div></li>' for i,step in enumerate(S[5]['flow_steps'],1))
flows=f'''<section class="flows section-shell feature" id="flows" aria-labelledby="flows-heading"><div class="flows-copy">{label(3,'Flows','flows')}<h2 class="section-headline" id="flows-heading">{escape(S[5]['headline'])}</h2><ul class="flows-benefits" role="list">{flows_benefits}</ul></div><figure class="flows-visual" aria-label="Example user flow: booking a service"><div class="flows-backdrop"><div class="flow-sequence" data-flow-sequence><div class="flow-sequence-heading">{icon('flows')}<span>{escape(S[5]['flow_title'])}</span><span class="flow-step-count">6 steps</span></div><ol class="flow-steps" aria-label="Service booking steps">{flow_steps}</ol></div></div></figure></section>'''



skill_options = [('Taste Skill', 'Visual direction', 'skills'), ('Emil Kowalski', 'Motion Design', 'skills'), ('UI UX Pro Max', 'Design patterns', 'skills')]
library_options = [('shadcn/ui', 'UI components', 'components'), ('Magic UI', 'Motion & interactions', 'components'), ('Bklit UI', 'Charts & data visualization', 'components')]
def toolkit_art(group, index, glyph):
    images = {
        'skills': ['taste-skill.png', 'emil-kowalski.png', 'ui-ux-pro-max-logo.png'],
        'libraries': ['shadcn-avatar.jpg', 'magic-ui-logo.svg', 'bklit-ui.png'],
    }
    return f'<img src="/assets/{images[group][index]}" alt="" width="42" height="42" loading="lazy">'
def toolkit_rows(options, group):
    return ''.join(f'''<div class="toolkit-option" data-toolkit-row>
      <span class="toolkit-option-art {group}-art-{i}" aria-hidden="true">{toolkit_art(group, i, glyph)}</span>
      <span class="toolkit-option-copy"><span class="toolkit-option-name">{name}</span><span class="toolkit-option-detail">{detail}</span></span>
      <button type="button" class="toolkit-switch" role="switch" aria-checked="false" aria-label="{name}" data-toolkit-toggle data-group="{group}" data-default="{str(i in ((0, 1) if group == 'skills' else (0, 2))).lower()}" disabled><span></span></button>
    </div>''' for i,(name,detail,glyph) in enumerate(options))
skills=f'''<section class="skills-section section-shell feature" id="skills" aria-labelledby="skills-heading">
  <div class="skills-copy">{label(4,'Skills & components','skills')}<h2 class="section-headline" id="skills-heading">{escape(S[6]['headline'])}</h2><p>{escape(S[6]['body'])}</p></div>
  <div class="skills-infographic" data-toolkit-flow role="group" aria-label="Skills and component installation demo">
    <div class="toolkit-panels">
      <div class="toolkit-panel" data-toolkit-panel="skills"><div class="toolkit-panel-heading">{icon('skills')}<h3>Skills</h3><span class="toolkit-count" data-toolkit-count="skills">0 active</span></div><div class="toolkit-options">{toolkit_rows(skill_options,'skills')}</div></div>
      <div class="toolkit-panel" data-toolkit-panel="libraries"><div class="toolkit-panel-heading">{icon('components')}<h3>Component libraries</h3><span class="toolkit-count" data-toolkit-count="libraries">0 active</span></div><div class="toolkit-options">{toolkit_rows(library_options,'libraries')}</div></div>
    </div>
    <div class="toolkit-routing" aria-hidden="true">
      <svg class="toolkit-wires" viewBox="0 0 820 156" fill="none" preserveAspectRatio="none">
        <defs><linearGradient id="toolkit-feed-gradient" x1="410" y1="0" x2="410" y2="156" gradientUnits="userSpaceOnUse"><stop stop-color="#b6b3fa" stop-opacity=".4"/><stop offset="1" stop-color="#7b76df"/></linearGradient></defs>
        <path class="toolkit-wire" d="M199 0V24C199 86 410 36 410 112V150"/>
        <path class="toolkit-wire" d="M621 0V24C621 86 410 36 410 112V150"/>
        <g class="toolkit-feed" data-toolkit-feed="skills"><path class="toolkit-feed-halo" pathLength="100" d="M199 0V24C199 86 410 36 410 112V150"/><path class="toolkit-feed-core" pathLength="100" d="M199 0V24C199 86 410 36 410 112V150"/></g>
        <g class="toolkit-feed" data-toolkit-feed="libraries"><path class="toolkit-feed-halo" pathLength="100" d="M621 0V24C621 86 410 36 410 112V150"/><path class="toolkit-feed-core" pathLength="100" d="M621 0V24C621 86 410 36 410 112V150"/></g>
        <path class="toolkit-arrow" d="m403 143 7 7 7-7"/>
      </svg>
    </div>
    <div class="toolkit-destination"><span class="toolkit-stage-halo" aria-hidden="true"></span><span class="toolkit-stage-mark"><img class="toolkit-app-icon" src="/assets/stage-macos-icon.png" alt="Stage" width="500" height="500" loading="lazy"></span></div>
    <span class="toolkit-status" role="status" aria-live="polite" data-toolkit-status>Choose skills and component libraries to add to Stage.</span>
  </div>
</section>'''

def integration_group(items, duplicate=False):
    cards=''.join(f'<div class="integration-card" role="listitem">{icon(tool["icon"], "icon integration-logo-" + tool["icon"])}<div><span class="integration-name">{tool["name"]}</span><span class="integration-use">{tool["useCase"]}</span></div></div>' for tool in items)
    return f'<div class="integration-group{" integration-duplicate" if duplicate else ""}" role="list" {"aria-hidden=true" if duplicate else ""}>{cards}</div>'

integration_rows=''.join(f'<div class="integration-row"><div class="integration-track">{integration_group(items)}{integration_group(items,True)}{integration_group(items,True)}</div></div>' for items in [S[8]['tools'][:5],S[8]['tools'][5:]])
integrations=f'''<section class="integrations-section section-shell feature" id="integrations" aria-labelledby="integrations-title"><span id="mcp" class="legacy-section-anchor" aria-hidden="true"></span><div class="integrations-copy">{label(6,'Integrations','components')}<h2 class="section-headline" id="integrations-title">{S[8]['headline']}</h2><p>{S[8]['body']}</p></div><div class="integrations-gallery" id="integrations-gallery" data-integrations-gallery>{integration_rows}</div></section>'''


# Chapter times follow the supplied Stage-to-Cursor recording.
export_times=[1.5,4.0,7.0]
export_details = ['Select the pages you need and export your project as Markdown.', 'Bring the exported files into Cursor, Claude Code or Codex.', 'Ask your agent to read AGENTS.md and build from your decisions.']
export_tabs=''.join(f'<button type="button" id="export-step-{i}" aria-controls="export-film" aria-current="{"step" if i==0 else "false"}" data-export-step="{export_times[i]}"><span class="export-mobile-step">Step {i+1}</span><span>{step["headline"]}</span><span class="export-mobile-description">{export_details[i]}</span>{icon("right")}</button>' for i,step in enumerate(S[7]['sequence']))
export=f'''<section class="export-section export-sequence feature" id="export"><div class="section-shell"><div class="export-scroll-track" data-export-scroll><div class="export-demo"><div class="export-copy"><div class="export-header">{label(5,'Export','share')}<h2 class="section-headline">{S[7]['headline']}</h2><p>{S[7]['body']}</p></div><div class="export-tabs" role="group" aria-label="Export video chapters">{export_tabs}</div></div><div class="export-stage"><video id="export-film" data-export-film width="1440" height="810" preload="none" muted playsinline controls poster="/assets/stage-export-poster.jpg" aria-label="Stage export demonstration: select Research, Strategy, Moodboard and Flows, export the Markdown files, open them in the AI workspace, and ask the agent to read AGENTS.md and build the product." src="/assets/stage-export-scroll.mp4">Watch the <a href="/assets/stage-export-scroll.mp4">Stage export demonstration</a>.</video><p class="export-video-error" data-export-error hidden>The video could not load. <a href="/assets/stage-export-scroll.mp4">Open the demonstration</a>.</p></div></div></div></div></section>'''

plan_cards=''.join(f'''<article class="price-card"><div class="plan-name">{icon('stage-symbol')}<h3>{p['name']}</h3></div><p class="plan-positioning">{p['positioning']}</p><div class="plan-price">{p['price']}<span>{p['interval']}</span></div><ul>{''.join('<li>'+icon('tick')+f'<span>{f}</span></li>' for f in p['features'])}</ul>{download(cls='button '+('button-primary' if p['name']=='Studio' else 'button-neutral'))}<p class="cta-caption pricing-trial">{S[1]['microcopy']}</p></article>''' for p in S[10]['plans'][:2])
TESTIMONIALS = json.loads((ROOT / 'testimonials.json').read_text())['testimonials']
testimonial_cards = ''.join(f'''<article class="testimonial-card" role="group" aria-roledescription="slide" aria-label="{i+1} of {len(TESTIMONIALS)}"><img class="testimonial-logo" src="{t['logo']}" alt="{escape(t['company'])}" loading="lazy"><blockquote><p>“{escape(t['quote'])}”</p></blockquote><div class="testimonial-author"><img src="{t['photo']}" alt="" width="48" height="48" loading="lazy"><div><p class="testimonial-name">{escape(t['name'])}</p><p class="testimonial-role">{escape(t['role'])}, {escape(t['company'])}</p></div></div></article>''' for i,t in enumerate(TESTIMONIALS))
testimonials=f'''<section class="testimonials section-shell" id="testimonials" aria-labelledby="testimonials-heading" aria-roledescription="carousel"><div class="pricing-heading testimonial-heading">{label(7,"Testimonials","quote")}<h2 class="section-headline" id="testimonials-heading">From builders shipping with Stage.</h2></div><div class="testimonial-track" id="testimonial-track" tabindex="0" aria-label="Customer testimonials. Use arrow keys to browse." data-lenis-prevent-horizontal>{testimonial_cards}</div><div class="testimonial-controls" hidden><button class="button button-neutral" type="button" data-testimonial-prev aria-label="Previous testimonials" aria-controls="testimonial-track">{icon('right','icon testimonial-arrow-back')}</button><button class="button button-neutral" type="button" data-testimonial-next aria-label="Next testimonials" aria-controls="testimonial-track">{icon('right')}</button></div></section>'''

pricing=f'''<section class="pricing section-shell" id="pricing"><div class="pricing-heading">{label(7,"Pricing","pricing")}<h2 class="section-headline">{S[10]['headline']}</h2></div><div class="pricing-grid">{plan_cards}</div><div class="enterprise"><div><h3>Enterprise</h3><p>{S[10]['plans'][2]['positioning']}</p></div><a href="mailto:hello@getstage.co">Contact us {icon('right')}</a></div></section>'''

faq_items=''.join(f'<details><summary>{q["question"]}{icon("chevron-down")}</summary><p>{q["answer"]}</p></details>' for q in S[11]['items'])
faq=f'''<section class="faq section-shell" id="faq"><div class="faq-heading">{label(8,"FAQ","faq")}<h2 class="section-headline">{S[11]['headline']}</h2></div><div class="faq-list">{faq_items}</div></section>'''
closing=f'''<section class="closing section-shell" id="download"><img src="/assets/stage-logo.png" alt="Stage app icon" width="72" height="72"><h2 class="section-headline">{S[12]['headline']}</h2>{download(escape(S[1]['primaryCta']))}<p class="cta-caption">{S[12]['microcopy']}</p></section>'''

page=head(CONTENT['meta']['title'], CONTENT['meta']['description'])+f'<body>{nav}<main id="main">{hero}{shift}{research}{moodboard}{flows}{skills}{export}{integrations}{testimonials}{pricing}{faq}{closing}</main>{footer()}<div class="nav-scrim" id="nav-scrim" hidden></div>{dialog()}<script src="/config.js"></script><script src="/site.js" defer></script><script src="/assets/vendor/lenis.min.js" defer></script><script src="/experience.js" defer></script></body></html>'
(DIST/'index.html').write_text(version_assets(page))

download_nav=nav.replace('href="#', 'href="/#')
getstarted=f'''<body class="download-page"><div id="top"></div>{download_nav}<main class="download-main" id="main"><div class="download-content"><header class="download-intro"><h1>You’re almost there!</h1><p>Your download will begin automatically.</p><p role="status">Did not work? <span>Download Stage manually.</span></p></header><ol class="onboarding-grid"><li class="onboarding-step"><figure class="onboarding-art"><img src="/assets/screen-1.png" width="1440" height="900" alt="Stage app icon in the macOS Dock"></figure><p>Open <strong>Stage</strong> from your Applications folder</p></li><li class="onboarding-step"><figure class="onboarding-art"><img src="/assets/screen-2.png" width="1440" height="900" alt="Stage project type selection with Web Design selected"></figure><p>Choose the type of <strong>project</strong> you’re building</p></li><li class="onboarding-step"><figure class="onboarding-art"><img src="/assets/screen-3.png" width="1440" height="900" alt="Stage navigation with the Research section selected"></figure><p>Open <strong>Research</strong> to start your project</p></li></ol></div></main>{footer()}<div class="nav-scrim" id="nav-scrim" hidden></div>{dialog()}<script src="/config.js"></script><script src="/site.js" defer></script></body></html>'''
(DIST/'download').mkdir(exist_ok=True)
(DIST/'download'/'index.html').write_text(version_assets(head('Get started with Stage', 'Download Stage for macOS and start with the thinking behind your next product.')+getstarted))
print('Built landing page and /download/.')
