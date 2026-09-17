import { Scene } from "../../shared/schemas.js"

// Every new session begins here. Parsed at import so a content mistake fails immediately.
// No exits: moving into a new scene adds the exit to it.
export const STARTING_SCENE = Scene.parse({
  id: "the-tesseract",
  roomName: "The Tesseract",
  description: `You stand before the Tesseract. Or rather, you exist in a vaguely upright manner, you think. Well, you don't think, as that would require a brain, which currently doesn't exist. And therefore, in Cartesian terms, you don't exist either. Except that you do, Rene be damned, and you exist in a vaguely upright manner in front of the Tesseract. And also behind it, and inside it, in both a literally physical way and also a wibbly-wobbly temporal way. In fact, you're pretty sure (or would be if you were thinking) that this cosmic hypercube actually is all of reality somehow, but also more than reality. Each face of the Tesseract grips your un-mind with the full force of an eternal universe, which would have driven you quite mad if you were capable of being driven mad. Instead, you see a pleroma shattered into an infinite number of edges, vertices and faces, each lasting the entirety of eternity, each existing in four dimensions that you can perceive, and the only thing you can really make out from staring into the abyss is that: Yes, the abyss actually is staring back into you; and it's no wonder God hasn't been seen around for several thousand years, They almost certainly gave up trying to figure this out and decided to play a game of correspondence chess with Eru Iluvatar.

You can try to focus on one particular aspect of the Tesseract and merge into that universe, or you can allow yourself to be pulled into one of its own accord.`,
})
