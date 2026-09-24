export function ProblemSection() {
  return (
    <>
      <section
        className="problem-story"
        id="shift"
        aria-labelledby="problem-title"
      >
        <div className="problem-inner">
          <div className="problem-copy">
            <h2 className="screen-reader-only" id="problem-title">
              Before the build
            </h2>
            <p className="problem-paragraph" data-reading>
              <span className="screen-reader-only">
                Your AI builds what you ask for. But the result still feels
                generic, and another prompt doesn’t quite fix it.
              </span>
              <span aria-hidden="true">
                <span className="reading-word">Your</span>{" "}
                <span className="reading-cluster">
                  <span className="reading-word">AI</span>
                  <span className="inline-decision">
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
                        d="M7.25 7.75L9 9.5L7.25 11.25M10.75 11.25H12.75M5.75 20.25H18.25C19.3546 20.25 20.25 19.3546 20.25 18.25V5.75C20.25 4.64543 19.3546 3.75 18.25 3.75H5.75C4.64543 3.75 3.75 4.64543 3.75 5.75V18.25C3.75 19.3546 4.64543 20.25 5.75 20.25Z"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>{" "}
                <span className="reading-word">builds</span>{" "}
                <span className="reading-word">what</span>{" "}
                <span className="reading-word">you</span>{" "}
                <span className="reading-word">ask</span>{" "}
                <span className="reading-word">for.</span>{" "}
                <span className="reading-word">But</span>{" "}
                <span className="reading-word">the</span>{" "}
                <span className="reading-word">result</span>{" "}
                <span className="reading-word">still</span>{" "}
                <span className="reading-word">feels</span>{" "}
                <span className="reading-word">generic,</span>{" "}
                <span className="reading-word">and</span>{" "}
                <span className="reading-word">another</span>{" "}
                <span className="reading-word">prompt</span>{" "}
                <span className="reading-word">doesn’t</span>{" "}
                <span className="reading-word">quite</span>{" "}
                <span className="reading-word">fix</span>{" "}
                <span className="reading-word">it.</span>
              </span>
            </p>
            <p className="problem-paragraph" data-reading>
              <span className="screen-reader-only">
                What’s often missing is a clear direction: what the product
                should do, how it should feel, and which references to learn
                from.
              </span>
              <span aria-hidden="true">
                <span className="reading-word">What’s</span>{" "}
                <span className="reading-word">often</span>{" "}
                <span className="reading-word">missing</span>{" "}
                <span className="reading-word">is</span>{" "}
                <span className="reading-word">a</span>{" "}
                <span className="reading-word">clear</span>{" "}
                <span className="reading-word">direction:</span>{" "}
                <span className="reading-word">what</span>{" "}
                <span className="reading-word">the</span>{" "}
                <span className="reading-word">product</span>{" "}
                <span className="reading-word">should</span>{" "}
                <span className="reading-word">do,</span>{" "}
                <span className="reading-word">how</span>{" "}
                <span className="reading-word">it</span>{" "}
                <span className="reading-word">should</span>{" "}
                <span className="reading-word">feel,</span>{" "}
                <span className="reading-word">and</span>{" "}
                <span className="reading-word">which</span>{" "}
                <span className="reading-word">references</span>{" "}
                <span className="reading-word">to</span>{" "}
                <span className="reading-word">learn</span>{" "}
                <span className="reading-cluster">
                  <span className="reading-word">from.</span>
                  <span className="inline-decision">
                    <svg
                      className="icon"
                      aria-hidden="true"
                      width={16}
                      height={16}
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 16 16"
                      fill="none"
                    >
                      <circle
                        cx={7}
                        cy={7}
                        r="4.5"
                        stroke="currentColor"
                        strokeWidth="1.5"
                      />
                      <path
                        d="M10.5 10.5 14 14"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                </span>
              </span>
            </p>
          </div>
          <figure
            className="launch-video"
            id="launch-video"
            aria-label="Stage launch video"
          >
            <div
              className="launch-video-player"
              data-launch-player
              data-state="paused"
            >
              <video
                id="stage-launch-film"
                data-launch-film
                controls
                controlsList="nofullscreen"
                playsInline
                preload="metadata"
                poster="/landing-preview/assets/stage-launch-video-poster.jpg"
                width={1920}
                height={1080}
                tabIndex={0}
                aria-label="Stage launch video"
                aria-describedby="launch-video-help"
              >
                <source
                  src="/landing-preview/assets/stage-launch-video.mp4"
                  type="video/mp4"
                />
              </video>
              <span className="screen-reader-only" id="launch-video-help">
                Press Space to play or pause. Use the left and right arrow keys
                to seek.
              </span>
              <button
                className="launch-video-control launch-video-play"
                data-video-play
                type="button"
                aria-controls="stage-launch-film"
                aria-label="Play video"
                hidden
              >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M6.5 4.6c0-1.1 1.2-1.8 2.1-1.2l12 7.4c.9.5.9 1.9 0 2.4l-12 7.4c-.9.6-2.1-.1-2.1-1.2Z"
                    fill="currentColor"
                  />
                </svg>
              </button>
              <button
                className="launch-video-control launch-video-replay"
                data-video-replay
                type="button"
                aria-controls="stage-launch-film"
                aria-label="Replay video from the beginning"
                hidden
              >
                <span>Replay</span>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path
                    d="M5 5v5h5M5.8 9a8 8 0 1 1-.1 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                className="launch-video-control launch-video-sound"
                data-video-sound
                type="button"
                aria-controls="stage-launch-film"
                aria-label="Mute video"
                aria-pressed="false"
                hidden
              >
                <svg
                  data-video-icon="sound"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor" />
                  <path
                    d="M16 8a6 6 0 0 1 0 8M19 5a10 10 0 0 1 0 14"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.6"
                    strokeLinecap="round"
                  />
                </svg>
                <svg
                  data-video-icon="muted"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path d="M3 9h4l5-4v14l-5-4H3Z" fill="currentColor" />
                  <path
                    d="m17 9 5 6m0-6-5 6"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </button>
              <p
                className="launch-video-error"
                data-video-error
                role="status"
                hidden
              />
            </div>
          </figure>
          <div className="problem-copy">
            <p className="problem-paragraph" data-reading>
              <span className="screen-reader-only">
                Stage guides you through a clear design process, so you can turn
                your idea into a product people love using.
              </span>
              <span aria-hidden="true">
                <span className="reading-word">Stage</span>{" "}
                <span className="reading-word">guides</span>{" "}
                <span className="reading-word">you</span>{" "}
                <span className="reading-word">through</span>{" "}
                <span className="reading-word">a</span>{" "}
                <span className="reading-word">clear</span>{" "}
                <span className="reading-word">design</span>{" "}
                <span className="reading-word">process,</span>{" "}
                <span className="reading-word">so</span>{" "}
                <span className="reading-word">you</span>{" "}
                <span className="reading-word">can</span>{" "}
                <span className="reading-word">turn</span>{" "}
                <span className="reading-word">your</span>{" "}
                <span className="reading-cluster">
                  <span className="reading-word">idea</span>
                  <span className="inline-decision">
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
                        d="M8.74793 15.4838V17.25C8.74793 17.8023 9.19565 18.25 9.74793 18.25H14.2503C14.8026 18.25 15.2503 17.8023 15.2503 17.25V15.4838M8.74793 15.4838C8.33542 15.2765 7.94542 15.031 7.58257 14.7519C5.85901 13.4264 4.74823 11.3433 4.74823 9.00089C4.74823 4.99633 7.99456 1.75 11.9991 1.75C16.0037 1.75 19.25 4.99633 19.25 9.00089C19.25 11.3433 18.1392 13.4264 16.4157 14.7519C16.0528 15.031 15.6628 15.2765 15.2503 15.4838M8.74793 15.4838H15.2503M9.75 21.25H14.25"
                        stroke="currentColor"
                        strokeWidth="1.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </span>
                </span>{" "}
                <span className="reading-word">into</span>{" "}
                <span className="reading-word">a</span>{" "}
                <span className="reading-word">product</span>{" "}
                <span className="reading-word">people</span>{" "}
                <span className="reading-word">love</span>{" "}
                <span className="reading-word">using.</span>
              </span>
            </p>
          </div>
          <div
            className="problem-outro"
            id="stage-transition"
            aria-hidden="true"
          >
            <svg
              className="problem-outro-logo"
              aria-hidden="true"
              width={16}
              height={16}
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 18.847549438476562 22.6170597076416"
              fill="none"
            >
              <g transform="matrix(1 0 0 1 0 0)">
                <g transform="matrix(1 0 0 1 3.586974859237671 -0.00003359196853125468)">
                  <path
                    d="M12.770150184631348 0.001332007464952767 C13.349238395690918 -0.01778271608054638 13.916473388671875 0.1693493276834488 14.369529724121094 0.529167652130127 C14.862712860107422 0.9264522790908813 15.178245544433594 1.5018202066421509 15.247371673583984 2.1298623085021973 C15.315038681030273 2.7766377925872803 15.120246887207031 3.4235031604766846 14.706039428710938 3.926154851913452 C14.315176963806152 4.406948566436768 13.748673439025879 4.713438510894775 13.13110065460205 4.778232097625732 C12.793313980102539 4.810829162597656 12.42634391784668 4.792331695556641 12.058097839355469 4.831669330596924 C9.007440567016602 5.157419204711914 6.203010082244873 7.205220699310303 5.136446952819824 10.097158432006836 C5.068615913391113 10.281092643737793 4.94446325302124 10.6876802444458 4.920515537261963 10.868034362792969 C4.828280925750732 11.562505722045898 4.753098487854004 12.081620216369629 4.276148319244385 12.643614768981934 C3.8281617164611816 13.171449661254883 3.229703187942505 13.430914878845215 2.542767286300659 13.49014949798584 C1.8529493808746338 13.500505447387695 1.281557321548462 13.313175201416016 0.7722145915031433 12.844029426574707 C-0.20911741256713867 11.94044017791748 -0.08893968909978867 10.778329849243164 0.2293311506509781 9.609587669372559 C0.7765198349952698 7.6001434326171875 1.9064444303512573 5.662125110626221 3.3480379581451416 4.161764621734619 C5.804669380187988 1.576752781867981 9.197673797607422 0.07859037071466446 12.770150184631348 0.001332007464952767 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
                <g transform="matrix(1 0 0 1 0 9.289015769958496)">
                  <path
                    d="M12.589152336120605 0.014101671986281872 C12.64022159576416 0.004398951772600412 12.706245422363281 0.0032903659157454967 12.758956909179688 0.0013825276400893927 C13.40261173248291 -0.020294150337576866 14.02857494354248 0.21366102993488312 14.499141693115234 0.6517733931541443 C14.970255851745605 1.0951368808746338 15.243294715881348 1.7081903219223022 15.257156372070312 2.3535847663879395 C15.26974105834961 2.813464641571045 15.126380920410156 3.428697347640991 14.997612953186035 3.877857208251953 C14.425090789794922 5.875818252563477 13.281322479248047 7.741682052612305 11.844999313354492 9.24051570892334 C9.455323219299316 11.756863594055176 6.161557674407959 13.226628303527832 2.685821056365967 13.327834129333496 C1.982068657875061 13.332013130187988 1.4929161071777344 13.262604713439941 0.9136084914207458 12.811990737915039 C0.4120902121067047 12.427152633666992 0.08869458734989166 11.856255531311035 0.01743474416434765 11.229758262634277 C-0.060409385710954666 10.583999633789062 0.12447960674762726 9.934062004089355 0.5308084487915039 9.42512321472168 C0.9423353672027588 8.918001174926758 1.5539621114730835 8.604389190673828 2.2026875019073486 8.558055877685547 C2.5638201236724854 8.53243637084961 2.885885238647461 8.542430877685547 3.256155490875244 8.502093315124512 C5.710799217224121 8.21755313873291 7.918831825256348 6.880792617797852 9.302845001220703 4.841222286224365 C9.743681907653809 4.191648960113525 10.183242797851562 3.34057354927063 10.331708908081055 2.560540199279785 C10.423086166381836 1.9422187805175781 10.509720802307129 1.381894588470459 10.932318687438965 0.8846937417984009 C11.368230819702148 0.37166690826416016 11.913214683532715 0.08307456970214844 12.589152336120605 0.014101671986281872 Z"
                    fill="currentColor"
                    fillRule="nonzero"
                  />
                </g>
              </g>
            </svg>
          </div>
        </div>
      </section>
    </>
  );
}
