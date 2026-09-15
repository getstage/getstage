export function SkillsSection() {
  return (
    <>
      <section
        className="skills-section section-shell feature"
        id="skills"
        aria-labelledby="skills-heading"
      >
        <div className="skills-copy">
          <div className="section-label">
            <svg
              className="icon"
              aria-hidden="true"
              width={16}
              height={16}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
            >
              <path
                d="M7 20.25H4.75C3.64543 20.25 2.75 19.3546 2.75 18.25V17.25C2.75 16.6977 3.19772 16.25 3.75 16.25H13.25C13.8023 16.25 14.25 16.6977 14.25 17.25V18.75C14.25 19.5784 14.9216 20.25 15.75 20.25C16.5784 20.25 17.25 19.5784 17.25 18.75V5.5C17.25 4.5335 18.0335 3.75 19 3.75C19.9665 3.75 20.75 4.5335 20.75 5.5V8C20.75 8.55228 20.3023 9 19.75 9H17.5"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M15.5 20.25H6"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M19 3.75H10.5M5.75 13.5V16"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
              <path
                d="M7.08091 4.77036L6.54359 3.37334C6.45708 3.14842 6.24099 3 6 3C5.75901 3 5.54292 3.14842 5.45641 3.37334L4.91909 4.77036C4.71594 5.29854 4.29854 5.71594 3.77036 5.91909L2.37334 6.45641C2.14842 6.54292 2 6.75901 2 7C2 7.24099 2.14842 7.45708 2.37334 7.54359L3.77036 8.08091C4.29854 8.28406 4.71594 8.70146 4.91909 9.22964L5.45641 10.6267C5.54292 10.8516 5.75901 11 6 11C6.24099 11 6.45708 10.8516 6.54359 10.6267L7.08091 9.22964C7.28406 8.70146 7.70146 8.28406 8.22964 8.08091L9.62666 7.54359C9.85158 7.45708 10 7.24099 10 7C10 6.75901 9.85158 6.54292 9.62666 6.45641L8.22964 5.91909C7.70146 5.71594 7.28406 5.29854 7.08091 4.77036Z"
                fill="currentColor"
              />
            </svg>
            <span>Skills &amp; components</span>
          </div>
          <h2 className="section-headline" id="skills-heading">
            Choose what your AI builds with.
          </h2>
          <p>
            Discover skills and component libraries, install them in one click,
            and add them to your brief for the first build.
          </p>
        </div>
        <div
          className="skills-infographic"
          data-toolkit-flow
          role="group"
          aria-label="Skills and component installation demo"
        >
          <div className="toolkit-panels">
            <div className="toolkit-panel" data-toolkit-panel="skills">
              <div className="toolkit-panel-heading">
                <svg
                  className="icon"
                  aria-hidden="true"
                  width={16}
                  height={16}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M7 20.25H4.75C3.64543 20.25 2.75 19.3546 2.75 18.25V17.25C2.75 16.6977 3.19772 16.25 3.75 16.25H13.25C13.8023 16.25 14.25 16.6977 14.25 17.25V18.75C14.25 19.5784 14.9216 20.25 15.75 20.25C16.5784 20.25 17.25 19.5784 17.25 18.75V5.5C17.25 4.5335 18.0335 3.75 19 3.75C19.9665 3.75 20.75 4.5335 20.75 5.5V8C20.75 8.55228 20.3023 9 19.75 9H17.5"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.5 20.25H6"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M19 3.75H10.5M5.75 13.5V16"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinecap="round"
                  />
                  <path
                    d="M7.08091 4.77036L6.54359 3.37334C6.45708 3.14842 6.24099 3 6 3C5.75901 3 5.54292 3.14842 5.45641 3.37334L4.91909 4.77036C4.71594 5.29854 4.29854 5.71594 3.77036 5.91909L2.37334 6.45641C2.14842 6.54292 2 6.75901 2 7C2 7.24099 2.14842 7.45708 2.37334 7.54359L3.77036 8.08091C4.29854 8.28406 4.71594 8.70146 4.91909 9.22964L5.45641 10.6267C5.54292 10.8516 5.75901 11 6 11C6.24099 11 6.45708 10.8516 6.54359 10.6267L7.08091 9.22964C7.28406 8.70146 7.70146 8.28406 8.22964 8.08091L9.62666 7.54359C9.85158 7.45708 10 7.24099 10 7C10 6.75901 9.85158 6.54292 9.62666 6.45641L8.22964 5.91909C7.70146 5.71594 7.28406 5.29854 7.08091 4.77036Z"
                    fill="currentColor"
                  />
                </svg>
                <h3>Skills</h3>
                <span className="toolkit-count" data-toolkit-count="skills">
                  0 active
                </span>
              </div>
              <div className="toolkit-options">
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art skills-art-0"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/taste-skill.webp"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">Taste Skill</span>
                    <span className="toolkit-option-detail">
                      Visual direction
                    </span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="Taste Skill"
                    data-toolkit-toggle
                    data-group="skills"
                    data-default="true"
                    disabled
                  >
                    <span />
                  </button>
                </div>
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art skills-art-1"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/emil-kowalski.png"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">Emil Kowalski</span>
                    <span className="toolkit-option-detail">Motion Design</span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="Emil Kowalski"
                    data-toolkit-toggle
                    data-group="skills"
                    data-default="true"
                    disabled
                  >
                    <span />
                  </button>
                </div>
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art skills-art-2"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/ui-ux-pro-max-logo.png"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">UI UX Pro Max</span>
                    <span className="toolkit-option-detail">
                      Design patterns
                    </span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="UI UX Pro Max"
                    data-toolkit-toggle
                    data-group="skills"
                    data-default="false"
                    disabled
                  >
                    <span />
                  </button>
                </div>
              </div>
            </div>
            <div className="toolkit-panel" data-toolkit-panel="libraries">
              <div className="toolkit-panel-heading">
                <svg
                  className="icon"
                  aria-hidden="true"
                  width={16}
                  height={16}
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                >
                  <path
                    d="M8.95696 5.04274L11.2927 2.70696C11.6833 2.31643 12.3164 2.31643 12.707 2.70696L15.0427 5.04274C15.4333 5.43327 15.4333 6.06643 15.0427 6.45696L12.707 8.79274C12.3164 9.18327 11.6833 9.18327 11.2927 8.79274L8.95696 6.45696C8.56643 6.06643 8.56643 5.43327 8.95696 5.04274Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M8.95696 17.5427L11.2927 15.207C11.6833 14.8164 12.3164 14.8164 12.707 15.207L15.0427 17.5427C15.4333 17.9333 15.4333 18.5664 15.0427 18.957L12.707 21.2927C12.3164 21.6833 11.6833 21.6833 11.2927 21.2927L8.95696 18.957C8.56643 18.5664 8.56643 17.9333 8.95696 17.5427Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M2.70696 11.2927L5.04274 8.95696C5.43327 8.56643 6.06643 8.56643 6.45696 8.95696L8.79274 11.2927C9.18327 11.6833 9.18327 12.3164 8.79274 12.707L6.45696 15.0427C6.06643 15.4333 5.43327 15.4333 5.04274 15.0427L2.70696 12.707C2.31643 12.3164 2.31643 11.6833 2.70696 11.2927Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M15.207 11.2927L17.5427 8.95696C17.9333 8.56643 18.5664 8.56643 18.957 8.95696L21.2927 11.2927C21.6833 11.6833 21.6833 12.3164 21.2927 12.707L18.957 15.0427C18.5664 15.4333 17.9333 15.4333 17.5427 15.0427L15.207 12.707C14.8164 12.3164 14.8164 11.6833 15.207 11.2927Z"
                    stroke="currentColor"
                    strokeWidth="1.5"
                    strokeLinejoin="round"
                  />
                </svg>
                <h3>Component libraries</h3>
                <span className="toolkit-count" data-toolkit-count="libraries">
                  0 active
                </span>
              </div>
              <div className="toolkit-options">
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art libraries-art-0"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/shadcn-avatar.jpg"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">shadcn/ui</span>
                    <span className="toolkit-option-detail">UI components</span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="shadcn/ui"
                    data-toolkit-toggle
                    data-group="libraries"
                    data-default="true"
                    disabled
                  >
                    <span />
                  </button>
                </div>
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art libraries-art-1"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/magic-ui-logo.svg"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">Magic UI</span>
                    <span className="toolkit-option-detail">
                      Motion &amp; interactions
                    </span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="Magic UI"
                    data-toolkit-toggle
                    data-group="libraries"
                    data-default="false"
                    disabled
                  >
                    <span />
                  </button>
                </div>
                <div className="toolkit-option" data-toolkit-row>
                  <span
                    className="toolkit-option-art libraries-art-2"
                    aria-hidden="true"
                  >
                    <img
                      src="/landing-preview/assets/bklit-ui.webp"
                      alt=""
                      width={42}
                      height={42}
                    />
                  </span>
                  <span className="toolkit-option-copy">
                    <span className="toolkit-option-name">Bklit UI</span>
                    <span className="toolkit-option-detail">
                      Charts &amp; data visualization
                    </span>
                  </span>
                  <button
                    type="button"
                    className="toolkit-switch"
                    role="switch"
                    aria-checked="false"
                    aria-label="Bklit UI"
                    data-toolkit-toggle
                    data-group="libraries"
                    data-default="true"
                    disabled
                  >
                    <span />
                  </button>
                </div>
              </div>
            </div>
          </div>
          <div className="toolkit-routing" aria-hidden="true">
            <svg
              className="toolkit-wires"
              viewBox="0 0 820 156"
              fill="none"
              preserveAspectRatio="none"
            >
              <defs>
                <linearGradient
                  id="toolkit-feed-gradient"
                  x1={410}
                  y1={0}
                  x2={410}
                  y2={156}
                  gradientUnits="userSpaceOnUse"
                >
                  <stop stopColor="#b6b3fa" stopOpacity=".4" />
                  <stop offset={1} stopColor="#7b76df" />
                </linearGradient>
              </defs>
              <path
                className="toolkit-wire"
                d="M199 0V24C199 86 410 36 410 112V150"
              />
              <path
                className="toolkit-wire"
                d="M621 0V24C621 86 410 36 410 112V150"
              />
              <g className="toolkit-feed" data-toolkit-feed="skills">
                <path
                  className="toolkit-feed-halo"
                  pathLength={100}
                  d="M199 0V24C199 86 410 36 410 112V150"
                />
                <path
                  className="toolkit-feed-core"
                  pathLength={100}
                  d="M199 0V24C199 86 410 36 410 112V150"
                />
              </g>
              <g className="toolkit-feed" data-toolkit-feed="libraries">
                <path
                  className="toolkit-feed-halo"
                  pathLength={100}
                  d="M621 0V24C621 86 410 36 410 112V150"
                />
                <path
                  className="toolkit-feed-core"
                  pathLength={100}
                  d="M621 0V24C621 86 410 36 410 112V150"
                />
              </g>
              <path className="toolkit-arrow" d="m403 143 7 7 7-7" />
            </svg>
          </div>
          <div className="toolkit-destination">
            <span className="toolkit-stage-halo" aria-hidden="true" />
            <span className="toolkit-stage-mark">
              <img
                className="toolkit-app-icon"
                src="/landing-preview/assets/stage-macos-icon.webp"
                alt="Stage"
                width={500}
                height={500}
                loading="lazy"
              />
            </span>
          </div>
          <span
            className="toolkit-status"
            role="status"
            aria-live="polite"
            data-toolkit-status
          >
            Choose skills and component libraries to add to Stage.
          </span>
        </div>
      </section>
    </>
  );
}
