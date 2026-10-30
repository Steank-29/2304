import { useEffect, useRef, useState } from "react";
import { createHeartScene } from "./HeartScene";
import { hint, chapters, finale } from "./content";

const EXT = ["jpg", "jpeg", "png", "webp"];

// Tries 1.jpg, 1.jpeg, 1.png, 1.webp... and shows an elegant empty frame if none exists yet
function Photo({ name }) {
  const [k, setK] = useState(0);
  if (k >= EXT.length)
    return (
      <div className="empty">
        <span>♡</span>
        <small>public/images/{name}.jpg</small>
      </div>
    );
  return <img className="photo" src={`/images/${name}.${EXT[k]}`} alt="" onError={() => setK(k + 1)} />;
}

export default function App() {
  const mount = useRef(null);
  const bar = useRef(null);
  const [phase, setPhase] = useState("idle"); // idle | beat | opening | gallery | finale
  const [i, setI] = useState(0);
  const [run, setRun] = useState(0);

  useEffect(
    () =>
      createHeartScene(mount.current, {
        onStart: () => setPhase("beat"),
        onProgress: (p) => bar.current && (bar.current.style.transform = `scaleX(${p})`),
        onOpening: () => setPhase("opening"),
        onOpened: () => setPhase("gallery"),
      }),
    [run]
  );

  const last = i === chapters.length - 1;
  const next = () => (last ? setPhase("finale") : setI(i + 1));
  const replay = () => {
    setPhase("idle");
    setI(0);
    setRun(run + 1);
  };
  const after = 1.2 + finale.lines.length * 2.4; // when the signature appears

  return (
    <div className={`stage is-${phase}`}>
      <div ref={mount} className="scene" />
      {phase === "opening" && <div className="bloom" />}

      {(phase === "idle" || phase === "beat") && (
        <div className="hud">
          <p>{hint}</p>
          <div className="track"><div ref={bar} className="fill" /></div>
        </div>
      )}

      {phase === "gallery" && (
        <section className="slide" key={i}>
          <figure className="frame" onClick={next}><Photo name={chapters[i].photo} /></figure>
          <p className="caption">{chapters[i].text}</p>
          <button onClick={next}>{last ? "Continuer" : "Suivant"}</button>
          <div className="dots">
            {chapters.map((_, n) => <i key={n} className={n <= i ? "on" : ""} />)}
          </div>
        </section>
      )}

      {phase === "finale" && (
        <section className="ending">
          <figure className="frame"><Photo name={finale.photo} /></figure>
          <div className="letter">
            {finale.lines.map((line, n) => (
              <p key={n} style={{ animationDelay: `${1.2 + n * 2.4}s` }}>{line}</p>
            ))}
            <p className="sign" style={{ animationDelay: `${after}s` }}>{finale.sign}</p>
            <button onClick={replay} style={{ animationDelay: `${after + 2.5}s` }}>Revivre ce moment</button>
          </div>
        </section>
      )}
    </div>
  );
}
