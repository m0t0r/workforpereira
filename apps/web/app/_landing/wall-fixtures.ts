import hectorFace from "./fixture-faces/hector.jpg";
import wilmarFace from "./fixture-faces/wilmar.jpg";
import yeimyFace from "./fixture-faces/yeimy.jpg";
import type { Wall } from "./wall";

/**
 * # Fictional people. Never reached in production.
 *
 * `packages/design-system/README.md`, Content rules: _"Avoid fictional person or pay data outside a
 * prototype clearly marked as one."_ This file is the marking, and it is not the only one — the
 * page renders `FixtureNotice` above the header whenever these rows are in play, so the mark is on
 * screen and not only in a comment. `readWall` refuses to reach this module when
 * `NODE_ENV === "production"`, so the rule is enforced by the build rather than by discipline.
 *
 * **Why it exists.** `packages/db/src/schema/index.ts` is empty and `@repo/matching` does not
 * exist, so the honest Wall is an empty one — and an empty Wall makes the landing page impossible
 * to judge as a landing page. These rows are here to be looked at, not to be shipped, and they go
 * away in the same commit that gives `readWall` a query.
 *
 * **What they are chosen to exercise**, because a fixture that only shows the happy path is worth
 * nothing:
 *
 * - **All four combinations of Photo and Self-description appear**, because `ProfileCard` branches
 *   on both and each branch is a rule with no automated guard. Three of the six have no Photo,
 *   including the first one, and they get no placeholder at all. Two have no Self-description — the
 *   common case, since ADR-0025 never asks a worker for one — and those rows lead with the name
 *   instead of with a sentence. A branch only ever seen in one arrangement in dev is a branch
 *   nobody notices regressing.
 * - **The Self-descriptions are written as somebody would actually say it**, not as a CV line, and
 *   one of them addresses the reader as _usted_ — which is how a tradesman in Pereira talks to a
 *   customer. `PRODUCT.md` binds *our* copy to _tú_; it does not put words in a Person's mouth, and
 *   a fixture that made all six sound like the interface would hide exactly the register problem
 *   this field exists to allow.
 * - **Every profile names `Risaralda` and never a municipality.** ADR-0011's public tier stops at
 *   the department. Seeing six identical `Risaralda` lines beside six Needs that each name a
 *   different municipality is the fastest way to read what that rule costs and buys.
 * - **One Need is `hirer_home` and therefore has no author line** (ADR-0030), one is `remote`, and
 *   the rest spread across the other three Work Settings. All three Commitment values appear.
 * - **Names, skills and municipalities are Risaralda-shaped** — Dosquebradas, Santa Rosa de Cabal,
 *   La Virginia, Marsella, Belén de Umbría — because a fixture of `Lorem Ipsum` in `Springfield`
 *   hides exactly the line-length problems this page has to survive.
 *
 * **The faces are generated, and belong to nobody.** They come from a StyleGAN sampler
 * (`thispersondoesnotexist.com`), so no living person is depicted and there is no consent to
 * obtain — which is the whole reason stock photography is not an option here. A real face on a
 * fabricated profile of somebody who lost their income after an earthquake is the exact harm
 * ADR-0010 and ADR-0011 exist to prevent, and it is a breach of every standard model release
 * besides. **Two of the six are men and one is a woman among the profiles that have a Photo, and
 * the reverse among those that do not**, so neither branch of the ADR-0026 rule reads as belonging
 * to one kind of person.
 *
 * Worth knowing before adding more: the generator's training set skews heavily white and European,
 * so these three are the closest the source gets to the Eje Cafetero rather than a good likeness of
 * it. A prompt-controllable model would do better, and this comment is the note to whoever tries.
 *
 * They are **imported**, not served from `public/`. Everything in `public/` ships in the production
 * image whether or not anything references it; a module import is reachable only through
 * `readWall`'s dynamic `import()`, which the `NODE_ENV` guard already excludes from the production
 * build. So the faces are in the dev bundle and in no other.
 */
export const WALL_FIXTURES: Wall = {
  profiles: [
    {
      publicId: "fx-p1",
      fullName: "Luz Marina Ospina Cardona",
      department: "Risaralda",
      photoUrl: null,
      remote: false,
      skills: ["Cuidado de niños", "Cocina casera", "Aseo de vivienda"],
      selfDescription:
        "Cuido niños. Llevo diez años en eso y las mamás me vuelven a llamar. Si toca, dejo el almuerzo hecho.",
    },
    {
      publicId: "fx-p2",
      fullName: "Héctor Vallejo",
      department: "Risaralda",
      photoUrl: hectorFace.src,
      remote: false,
      skills: ["Albañilería", "Enchape", "Pintura de interiores"],
      selfDescription:
        "Le llevo la obra de principio a fin: levanto el muro, lo enchapo y lo pinto. Y le dejo el sitio limpio.",
    },
    {
      publicId: "fx-p3",
      fullName: "Yeimy Andrea Ríos",
      department: "Risaralda",
      photoUrl: yeimyFace.src,
      remote: true,
      skills: ["Atención al cliente", "Manejo de redes sociales", "Digitación"],
      selfDescription: null,
    },
    {
      publicId: "fx-p4",
      fullName: "Jhon Freddy Sepúlveda",
      department: "Risaralda",
      photoUrl: null,
      remote: false,
      skills: ["Conducción de motocicleta", "Mensajería", "Domicilios"],
      selfDescription: null,
    },
    {
      publicId: "fx-p5",
      fullName: "Gloria Inés Betancur",
      department: "Risaralda",
      photoUrl: null,
      remote: false,
      skills: ["Confección", "Arreglos de ropa", "Bordado a máquina"],
      selfDescription:
        "Coso desde los quince años. Arreglo, ajusto y hago prendas nuevas si me dan la tela y el modelo.",
    },
    {
      publicId: "fx-p6",
      fullName: "Wilmar Estiven Grajales",
      department: "Risaralda",
      photoUrl: wilmarFace.src,
      remote: true,
      skills: ["Contabilidad básica", "Facturación electrónica", "Excel"],
      selfDescription:
        "Llevo cuentas en Excel y facturo electrónico. No se me pierde un peso ni se me pasa una fecha.",
    },
  ],
  needs: [
    {
      publicId: "fx-n1",
      municipality: "Dosquebradas",
      remote: false,
      commitment: "one_off",
      workSetting: "hirer_home",
      selfDescription:
        "Se me cayó parte del cielo raso de la sala y necesito que lo desmonten y lo vuelvan a montar. Ya tengo las láminas compradas. Es cosa de dos o tres días.",
      skills: ["Drywall", "Pintura de interiores"],
      author: null,
    },
    {
      publicId: "fx-n2",
      municipality: "Pereira",
      remote: false,
      commitment: "ongoing",
      workSetting: "business_premises",
      selfDescription:
        "Tengo una panadería en el centro y necesito quien atienda el mostrador de lunes a sábado en la mañana. No hace falta experiencia en panadería, sí trato con la gente.",
      skills: ["Atención al cliente", "Manejo de caja"],
      author: { publicId: "fx-a2", fullName: "Marta Lucía Henao" },
    },
    {
      publicId: "fx-n3",
      municipality: "Santa Rosa de Cabal",
      remote: false,
      commitment: "temporary",
      workSetting: "public_or_varied",
      selfDescription:
        "Necesito ayuda para recoger café en la finca por lo que queda de la cosecha. Hay dónde quedarse si vienen de lejos.",
      skills: ["Recolección de café", "Trabajo agrícola"],
      author: { publicId: "fx-a3", fullName: "Álvaro Restrepo Gil" },
    },
    {
      publicId: "fx-n4",
      municipality: "Pereira",
      remote: true,
      commitment: "one_off",
      workSetting: "remote",
      selfDescription:
        "Necesito que alguien me pase a computador el inventario de la tienda, que lo tengo en cuadernos. Son como mil renglones.",
      skills: ["Digitación", "Excel"],
      author: { publicId: "fx-a4", fullName: "Norbey Cardona" },
    },
    {
      publicId: "fx-n5",
      municipality: "La Virginia",
      remote: false,
      commitment: "temporary",
      workSetting: "worker_home",
      selfDescription:
        "Se me dañó el uniforme de tres empleados y quiero mandar a hacer seis más iguales. Entrego la tela y el modelo.",
      skills: ["Confección", "Arreglos de ropa"],
      author: { publicId: "fx-a5", fullName: "Diana Marcela Tabares" },
    },
    {
      publicId: "fx-n6",
      municipality: "Marsella",
      remote: false,
      commitment: "ongoing",
      workSetting: "business_premises",
      selfDescription:
        "Busco quien maneje el camión de la finca para bajar la carga al pueblo dos veces por semana. Se necesita licencia C2 al día.",
      skills: ["Conducción de camión", "Cargue y descargue"],
      author: { publicId: "fx-a6", fullName: "Orlando Zapata" },
    },
  ],
};
