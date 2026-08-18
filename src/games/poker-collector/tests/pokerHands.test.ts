import { describe, expect, it } from "vitest";
import { createCard } from "../../../common/cards";
import { PokerHandDetector } from "../domain/pokerHands";

const detector = new PokerHandDetector();

describe("PokerHandDetector", () => {
  it("ワンペアは2枚だけを役カードとして返す", () => {
    const cards = [
      createCard("♠", "K"),
      createCard("♥", "K"),
      createCard("♠", "A"),
    ];
    const roles = detector.detectAllRoles(cards, "hard");
    const pair = roles.find((role) => role.type === "onePair");

    expect(pair).toBeDefined();
    expect(pair?.cards).toHaveLength(2);
    expect(pair?.baseScore).toBe(30);
    expect(pair?.discardKey).toBe("onePair:K");
  });

  it("ツーペアは4枚だけを役カードとして返す", () => {
    const cards = [
      createCard("♠", "K"),
      createCard("♥", "K"),
      createCard("♠", "A"),
      createCard("♥", "A"),
      createCard("♦", "Q"),
    ];
    const roles = detector.detectAllRoles(cards, "medium");
    const twoPair = roles.find((role) => role.type === "twoPair");

    expect(twoPair).toBeDefined();
    expect(twoPair?.cards).toHaveLength(4);
    expect(twoPair?.baseScore).toBe(90);
  });

  it("スリーカードは3枚だけを役カードとして返す", () => {
    const cards = [
      createCard("♠", "7"),
      createCard("♥", "7"),
      createCard("♦", "7"),
      createCard("♣", "K"),
    ];
    const roles = detector.detectAllRoles(cards, "hard");
    const three = roles.find((role) => role.type === "threeOfAKind");

    expect(three).toBeDefined();
    expect(three?.cards).toHaveLength(3);
    expect(three?.baseScore).toBe(140);
  });

  it("フルハウスと小役を同時に候補として返す", () => {
    const cards = [
      createCard("♠", "K"),
      createCard("♥", "K"),
      createCard("♦", "K"),
      createCard("♠", "A"),
      createCard("♥", "A"),
    ];
    const roles = detector.detectAllRoles(cards, "medium");

    expect(roles.some((role) => role.type === "fullHouse")).toBe(true);
    expect(roles.some((role) => role.type === "threeOfAKind")).toBe(true);
    expect(roles.some((role) => role.type === "twoPair")).toBe(true);
    expect(roles.some((role) => role.type === "onePair")).toBe(true);
  });

  it("Easyだけ4枚役と飛び地ストレートを有効にする", () => {
    const fourStraight = [
      createCard("♠", "2"),
      createCard("♥", "3"),
      createCard("♦", "4"),
      createCard("♣", "5"),
    ];
    const skipStraight = [
      createCard("♠", "A"),
      createCard("♥", "3"),
      createCard("♦", "5"),
      createCard("♣", "7"),
      createCard("♠", "9"),
    ];

    expect(detector.detectAllRoles(fourStraight, "easy").some((role) => role.type === "fourCardStraight")).toBe(true);
    expect(detector.detectAllRoles(fourStraight, "medium").some((role) => role.type === "fourCardStraight")).toBe(false);
    expect(detector.detectAllRoles(skipStraight, "easy").some((role) => role.type === "skipStraight")).toBe(true);
    expect(detector.detectAllRoles(skipStraight, "hard").some((role) => role.type === "skipStraight")).toBe(false);
  });

  it("破棄したワンペアはランク単位、それ以外は役単位で除外する", () => {
    const cards = [
      createCard("♠", "3"),
      createCard("♥", "3"),
      createCard("♠", "4"),
      createCard("♥", "4"),
    ];

    const pairDiscarded = detector.detectAllRoles(cards, "medium", new Set(["onePair:3"]));
    expect(pairDiscarded.some((role) => role.discardKey === "onePair:3")).toBe(false);
    expect(pairDiscarded.some((role) => role.discardKey === "onePair:4")).toBe(true);

    const twoPairDiscarded = detector.detectAllRoles(cards, "medium", new Set(["twoPair"]));
    expect(twoPairDiscarded.some((role) => role.type === "twoPair")).toBe(false);
  });
});
