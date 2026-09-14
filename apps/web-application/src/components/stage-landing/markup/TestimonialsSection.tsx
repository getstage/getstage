export function TestimonialsSection() {
  return (
    <>
      <section
        className="testimonials section-shell"
        id="testimonials"
        aria-labelledby="testimonials-heading"
        aria-roledescription="carousel"
      >
        <div className="pricing-heading testimonial-heading">
          <div className="section-label">
            <svg
              className="icon"
              aria-hidden="true"
              width={16}
              height={16}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M10 4H6.5A4.5 4.5 0 0 0 2 8.5V14a2 2 0 0 0 2 2h3.1c-.4 1.3-1.4 2.3-3.1 3v2c4.5-1.2 7-4.2 7-8V5a1 1 0 0 0-1-1ZM22 4h-3.5A4.5 4.5 0 0 0 14 8.5V14a2 2 0 0 0 2 2h3.1c-.4 1.3-1.4 2.3-3.1 3v2c4.5-1.2 7-4.2 7-8V5a1 1 0 0 0-1-1Z" />
            </svg>
            <span>Testimonials</span>
          </div>
          <h2 className="section-headline" id="testimonials-heading">
            From builders shipping with Stage.
          </h2>
        </div>
        <div
          className="testimonial-track"
          id="testimonial-track"
          tabIndex={0}
          aria-label="Customer testimonials. Use arrow keys to browse."
          data-lenis-prevent-horizontal
        >
          <article
            className="testimonial-card"
            role="group"
            aria-roledescription="slide"
            aria-label="1 of 4"
          >
            <img
              className="testimonial-logo"
              src="/landing-preview/assets/testimonials/pratik-logo.png"
              alt="Baseframe"
              loading="lazy"
            />
            <blockquote>
              <p>
                “I work in 4-week sprints, so speed is everything. Stage runs
                the research, strategy, and direction in one place - I get to
                Figma in a fraction of the time.”
              </p>
            </blockquote>
            <div className="testimonial-author">
              <img
                src="/landing-preview/assets/testimonials/pratik.jpg"
                alt=""
                width={48}
                height={48}
                loading="lazy"
              />
              <div>
                <p className="testimonial-name">Pratik Singh</p>
                <p className="testimonial-role">Design Lead, Baseframe</p>
              </div>
            </div>
          </article>
          <article
            className="testimonial-card"
            role="group"
            aria-roledescription="slide"
            aria-label="2 of 4"
          >
            <img
              className="testimonial-logo"
              src="/landing-preview/assets/testimonials/dudu-logo.png"
              alt="Toolfolio"
              loading="lazy"
            />
            <blockquote>
              <p>
                “Other AI tools race you to generic. I'd rather get the details
                right - Stage actually respects that and keeps up with me.”
              </p>
            </blockquote>
            <div className="testimonial-author">
              <img
                src="/landing-preview/assets/testimonials/dudu.jpg"
                alt=""
                width={48}
                height={48}
                loading="lazy"
              />
              <div>
                <p className="testimonial-name">Dudu</p>
                <p className="testimonial-role">Founder, Toolfolio</p>
              </div>
            </div>
          </article>
          <article
            className="testimonial-card"
            role="group"
            aria-roledescription="slide"
            aria-label="3 of 4"
          >
            <img
              className="testimonial-logo"
              src="/landing-preview/assets/testimonials/wessel-logo.svg"
              alt="Stage"
              loading="lazy"
            />
            <blockquote>
              <p>
                “Most designs fall apart when you build them. What comes out of
                Stage actually holds up in code - and that's rare.”
              </p>
            </blockquote>
            <div className="testimonial-author">
              <img
                src="/landing-preview/assets/testimonials/wessel.jpg"
                alt=""
                width={48}
                height={48}
                loading="lazy"
              />
              <div>
                <p className="testimonial-name">Wessel Dieben</p>
                <p className="testimonial-role">Full-Stack Dev, Stage</p>
              </div>
            </div>
          </article>
          <article
            className="testimonial-card"
            role="group"
            aria-roledescription="slide"
            aria-label="4 of 4"
          >
            <img
              className="testimonial-logo"
              src="/landing-preview/assets/testimonials/adrien-logo.png"
              alt="Logiaweb"
              loading="lazy"
            />
            <blockquote>
              <p>
                “I ship MVPs fast to test ideas, but I won't launch something
                ugly. Stage lets me move quick and still ship real, polished
                design.”
              </p>
            </blockquote>
            <div className="testimonial-author">
              <img
                src="/landing-preview/assets/testimonials/adrien.jpg"
                alt=""
                width={48}
                height={48}
                loading="lazy"
              />
              <div>
                <p className="testimonial-name">Adrien Ninet</p>
                <p className="testimonial-role">
                  Founder &amp; Creator, Logiaweb
                </p>
              </div>
            </div>
          </article>
        </div>
        <div className="testimonial-controls" hidden>
          <button
            className="button button-neutral"
            type="button"
            data-testimonial-prev
            aria-label="Previous testimonials"
            aria-controls="testimonial-track"
          >
            <svg
              className="icon testimonial-arrow-back"
              aria-hidden="true"
              width={16}
              height={16}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="none"
            >
              <defs>
                <filter
                  id="stage-right-2-1601-shadow-76"
                  x={-20}
                  y={-20}
                  width={60}
                  height={60}
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" />
                  <feOffset dx={0} dy="0.5" result="offset-shadow" />
                  <feFlood
                    floodColor="#000000"
                    floodOpacity="0.15000000596046448"
                  />
                  <feComposite in2="offset-shadow" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="stage-right-2-1602-shadow-76"
                  x={-20}
                  y={-20}
                  width={60}
                  height={60}
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" />
                  <feOffset dx={0} dy="0.5" result="offset-shadow" />
                  <feFlood
                    floodColor="#000000"
                    floodOpacity="0.15000000596046448"
                  />
                  <feComposite in2="offset-shadow" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g transform="matrix(1 0 0 1 0 0)">
                <g
                  transform="matrix(1 0 0 1 9.3330078125 3.83203125)"
                  filter="url(#stage-right-2-1601-shadow-76)"
                >
                  <path
                    d="M0.5303300619125366 -0.5303300619125366 C0.23743686079978943 -0.8232232928276062 -0.23743686079978943 -0.8232232928276062 -0.5303300619125366 -0.5303300619125366 C-0.8232232928276062 -0.23743686079978943 -0.8232232928276062 0.23743686079978943 -0.5303300619125366 0.5303300619125366 L0 0 L0.5303300619125366 -0.5303300619125366 Z M4.166666507720947 4.166666507720947 L4.696996688842773 4.696996688842773 C4.989889621734619 4.4041032791137695 4.989889621734619 3.929229497909546 4.696996688842773 3.636336326599121 L4.166666507720947 4.166666507720947 Z M-0.5303300619125366 7.803002834320068 C-0.8232232928276062 8.095895767211914 -0.8232232928276062 8.570769309997559 -0.5303300619125366 8.863662719726562 C-0.23743686079978943 9.156556129455566 0.23743686079978943 9.156556129455566 0.5303300619125366 8.863662719726562 L0 8.333333015441895 L-0.5303300619125366 7.803002834320068 Z M0 0 L-0.5303300619125366 0.5303300619125366 L3.636336326599121 4.696996688842773 L4.166666507720947 4.166666507720947 L4.696996688842773 3.636336326599121 L0.5303300619125366 -0.5303300619125366 L0 0 Z M4.166666507720947 4.166666507720947 L3.636336326599121 3.636336326599121 L-0.5303300619125366 7.803002834320068 L0 8.333333015441895 L0.5303300619125366 8.863662719726562 L4.696996688842773 4.696996688842773 L4.166666507720947 4.166666507720947 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
                <g
                  transform="matrix(1 0 0 1 2.5 8)"
                  filter="url(#stage-right-2-1602-shadow-76)"
                >
                  <path
                    d="M10.5 0.75 C10.914214134216309 0.75 11.25 0.4142135679721832 11.25 0 C11.25 -0.4142135679721832 10.914214134216309 -0.75 10.5 -0.75 L10.5 0 L10.5 0.75 Z M0 -0.75 C-0.4142135679721832 -0.75 -0.75 -0.4142135679721832 -0.75 0 C-0.75 0.4142135679721832 -0.4142135679721832 0.75 0 0.75 L0 0 L0 -0.75 Z M10.5 0 L10.5 -0.75 L0 -0.75 L0 0 L0 0.75 L10.5 0.75 L10.5 0 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
              </g>
            </svg>
          </button>
          <button
            className="button button-neutral"
            type="button"
            data-testimonial-next
            aria-label="Next testimonials"
            aria-controls="testimonial-track"
          >
            <svg
              className="icon"
              aria-hidden="true"
              width={16}
              height={16}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 16 16"
              fill="none"
            >
              <defs>
                <filter
                  id="stage-right-2-1601-shadow-77"
                  x={-20}
                  y={-20}
                  width={60}
                  height={60}
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" />
                  <feOffset dx={0} dy="0.5" result="offset-shadow" />
                  <feFlood
                    floodColor="#000000"
                    floodOpacity="0.15000000596046448"
                  />
                  <feComposite in2="offset-shadow" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
                <filter
                  id="stage-right-2-1602-shadow-77"
                  x={-20}
                  y={-20}
                  width={60}
                  height={60}
                  filterUnits="userSpaceOnUse"
                  colorInterpolationFilters="sRGB"
                >
                  <feGaussianBlur in="SourceAlpha" stdDeviation="0.75" />
                  <feOffset dx={0} dy="0.5" result="offset-shadow" />
                  <feFlood
                    floodColor="#000000"
                    floodOpacity="0.15000000596046448"
                  />
                  <feComposite in2="offset-shadow" operator="in" />
                  <feMerge>
                    <feMergeNode />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>
              <g transform="matrix(1 0 0 1 0 0)">
                <g
                  transform="matrix(1 0 0 1 9.3330078125 3.83203125)"
                  filter="url(#stage-right-2-1601-shadow-77)"
                >
                  <path
                    d="M0.5303300619125366 -0.5303300619125366 C0.23743686079978943 -0.8232232928276062 -0.23743686079978943 -0.8232232928276062 -0.5303300619125366 -0.5303300619125366 C-0.8232232928276062 -0.23743686079978943 -0.8232232928276062 0.23743686079978943 -0.5303300619125366 0.5303300619125366 L0 0 L0.5303300619125366 -0.5303300619125366 Z M4.166666507720947 4.166666507720947 L4.696996688842773 4.696996688842773 C4.989889621734619 4.4041032791137695 4.989889621734619 3.929229497909546 4.696996688842773 3.636336326599121 L4.166666507720947 4.166666507720947 Z M-0.5303300619125366 7.803002834320068 C-0.8232232928276062 8.095895767211914 -0.8232232928276062 8.570769309997559 -0.5303300619125366 8.863662719726562 C-0.23743686079978943 9.156556129455566 0.23743686079978943 9.156556129455566 0.5303300619125366 8.863662719726562 L0 8.333333015441895 L-0.5303300619125366 7.803002834320068 Z M0 0 L-0.5303300619125366 0.5303300619125366 L3.636336326599121 4.696996688842773 L4.166666507720947 4.166666507720947 L4.696996688842773 3.636336326599121 L0.5303300619125366 -0.5303300619125366 L0 0 Z M4.166666507720947 4.166666507720947 L3.636336326599121 3.636336326599121 L-0.5303300619125366 7.803002834320068 L0 8.333333015441895 L0.5303300619125366 8.863662719726562 L4.696996688842773 4.696996688842773 L4.166666507720947 4.166666507720947 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
                <g
                  transform="matrix(1 0 0 1 2.5 8)"
                  filter="url(#stage-right-2-1602-shadow-77)"
                >
                  <path
                    d="M10.5 0.75 C10.914214134216309 0.75 11.25 0.4142135679721832 11.25 0 C11.25 -0.4142135679721832 10.914214134216309 -0.75 10.5 -0.75 L10.5 0 L10.5 0.75 Z M0 -0.75 C-0.4142135679721832 -0.75 -0.75 -0.4142135679721832 -0.75 0 C-0.75 0.4142135679721832 -0.4142135679721832 0.75 0 0.75 L0 0 L0 -0.75 Z M10.5 0 L10.5 -0.75 L0 -0.75 L0 0 L0 0.75 L10.5 0.75 L10.5 0 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
              </g>
            </svg>
          </button>
        </div>
      </section>
    </>
  );
}
