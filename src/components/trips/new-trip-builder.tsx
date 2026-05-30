"use client";

import { useEffect, useMemo, useState } from "react";
import { AnalyticsHiddenFields } from "@/components/analytics/analytics-hidden-fields";
import { trackEvent } from "@/lib/analytics";
import type { MissionSeed } from "@/lib/missions";

type NewTripBuilderProps = {
  createSoloAction: (formData: FormData) => void | Promise<void>;
  createGroupAction: (formData: FormData) => void | Promise<void>;
  missionSeeds: MissionSeed[];
  challengeColor: string;
  challengeLocation: string;
  challengeTitle: string;
  challengeStartDate: string;
  challengeEndDate: string;
  challengeShareId: string;
  isChallengeFlow: boolean;
};

type GroupAssignment = {
  slot: number;
  colorName: string;
  colorHex: string;
  prompt: string;
};

type HuntMode = "solo" | "group";

function hashSeed(input: string) {
  let hash = 0;

  for (let index = 0; index < input.length; index += 1) {
    hash = (hash * 31 + input.charCodeAt(index)) >>> 0;
  }

  return hash || 1;
}

function createSeededRandom(seed: number) {
  let value = seed >>> 0;

  return function seededRandom() {
    value = (value * 1664525 + 1013904223) >>> 0;
    return value / 4294967296;
  };
}

function shuffleMissions(missions: MissionSeed[], seed: number) {
  const random = createSeededRandom(seed);
  const next = [...missions];

  for (let index = next.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
  }

  return next;
}

export function NewTripBuilder({
  createSoloAction,
  createGroupAction,
  missionSeeds,
  challengeColor,
  challengeLocation,
  challengeTitle,
  challengeStartDate,
  challengeEndDate,
  challengeShareId,
  isChallengeFlow,
}: NewTripBuilderProps) {
  const [title, setTitle] = useState(challengeTitle);
  const [location, setLocation] = useState(challengeLocation);
  const [startDate, setStartDate] = useState(challengeStartDate);
  const [endDate, setEndDate] = useState(challengeEndDate);
  const [selectedColor, setSelectedColor] = useState(challengeColor || "random");
  const [huntMode, setHuntMode] = useState<HuntMode>("solo");
  const [groupSize, setGroupSize] = useState(4);
  const [groupSeedOffset, setGroupSeedOffset] = useState(0);

  const baseSeed = useMemo(() => {
    return hashSeed([title, location, startDate, endDate, challengeColor].join("|"));
  }, [challengeColor, endDate, location, startDate, title]);

  const assignments = useMemo<GroupAssignment[]>(() => {
    const shuffled = shuffleMissions(missionSeeds, baseSeed + groupSeedOffset);
    return shuffled.slice(0, groupSize).map((mission, index) => ({
      slot: index,
      colorName: mission.color_name,
      colorHex: mission.color_hex,
      prompt: mission.prompt,
    }));
  }, [baseSeed, groupSeedOffset, groupSize, missionSeeds]);

  useEffect(() => {
    if (huntMode !== "group") {
      return;
    }

    if (selectedColor !== "random" && assignments.some((assignment) => assignment.colorName === selectedColor)) {
      return;
    }

    if (assignments[0]) {
      setSelectedColor(assignments[0].colorName);
    }
  }, [assignments, huntMode, selectedColor]);

  useEffect(() => {
    if (huntMode !== "group") {
      return;
    }

    trackEvent({
      eventName: "group_assigner_viewed",
      metadata: {
        groupSize,
        isChallengeFlow,
      },
    });
  }, [groupSize, isChallengeFlow]);

  return (
    <>
      <form action={huntMode === "group" ? createGroupAction : createSoloAction} className="mt-8 grid gap-5">
        <AnalyticsHiddenFields />
        {challengeShareId ? <input type="hidden" name="challenge_share_id" value={challengeShareId} /> : null}
        {challengeColor ? <input type="hidden" name="challenge_color_name" value={challengeColor} /> : null}
        {huntMode === "group" ? <input type="hidden" name="group_size" value={groupSize} /> : null}
        {huntMode === "group" ? (
          <input type="hidden" name="group_assignments_json" value={JSON.stringify(assignments)} />
        ) : null}
        <div>
          <label className="field-label" htmlFor="title">
            Poster title
          </label>
          <input
            id="title"
            name="title"
            className="field-input"
            placeholder="The Green Hunt"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            required
          />
        </div>

        <div>
          <label className="field-label" htmlFor="location">
            Location
          </label>
          <input
            id="location"
            name="location"
            className="field-input"
            placeholder="Lisbon, Portugal"
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            required
          />
        </div>

        {huntMode === "group" ? (
          <div className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className="field-label" htmlFor="start_date">
                Start date
              </label>
              <input
                id="start_date"
                name="start_date"
                className="field-input"
                type="date"
                value={startDate}
                onChange={(event) => setStartDate(event.target.value)}
              />
            </div>

            <div>
              <label className="field-label" htmlFor="end_date">
                End date
              </label>
              <input
                id="end_date"
                name="end_date"
                className="field-input"
                type="date"
                value={endDate}
                onChange={(event) => setEndDate(event.target.value)}
              />
            </div>
          </div>
        ) : (
          <>
            <input type="hidden" name="start_date" value={startDate} />
            <input type="hidden" name="end_date" value={endDate} />
          </>
        )}

        <div>
          <label className="field-label" htmlFor="color_name">
            {huntMode === "group" ? "Your color mission" : "Color mission"}
          </label>
          <select
            id="color_name"
            name="color_name"
            className="field-input"
            value={selectedColor}
            onChange={(event) => setSelectedColor(event.target.value)}
          >
            <option value="random">Random color</option>
            {missionSeeds.map((mission) => (
              <option key={mission.color_name} value={mission.color_name}>
                {mission.color_name} · {mission.prompt}
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-[1.6rem] border border-[rgba(53,37,30,0.1)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
          <p className="eyebrow">Challenge mode</p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                huntMode === "solo"
                  ? "border-[rgba(47,97,223,0.24)] bg-[rgba(47,97,223,0.08)]"
                  : "border-[rgba(53,37,30,0.08)] bg-white/70"
              }`}
              onClick={() => {
                setHuntMode("solo");
                trackEvent({
                  eventName: "hunt_mode_changed",
                  metadata: {
                    mode: "solo",
                  },
                });
              }}
            >
              <p className="text-lg font-semibold text-[var(--ink)]">Solo Hunt</p>
              <p className="body-copy mt-2 text-sm">
                Keep it simple. Set the poster title, choose one color for yourself, and make one poster from your own nine moments.
              </p>
            </button>

            <button
              type="button"
              className={`rounded-[1.25rem] border p-4 text-left transition ${
                huntMode === "group"
                  ? "border-[rgba(47,97,223,0.24)] bg-[rgba(47,97,223,0.08)]"
                  : "border-[rgba(53,37,30,0.08)] bg-white/70"
              }`}
              onClick={() => {
                setHuntMode("group");
                trackEvent({
                  eventName: "hunt_mode_changed",
                  metadata: {
                    mode: "group",
                  },
                });
              }}
            >
              <p className="text-lg font-semibold text-[var(--ink)]">Group Challenge</p>
              <p className="body-copy mt-2 text-sm">
                Auto-assign a different color to each person, generate invite links for the full group, and keep everyone on the same trip window.
              </p>
            </button>
          </div>
        </div>

        {huntMode === "group" ? (
          <div className="rounded-[1.6rem] border border-[rgba(47,97,223,0.12)] bg-[rgba(255,255,255,0.58)] p-4 sm:p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="eyebrow">Group Challenge</p>
                <h2 className="panel-title mt-2 text-2xl font-semibold">Assign unique colors for the whole group.</h2>
                <p className="body-copy mt-2 max-w-2xl text-sm sm:text-base">
                  This is the lightweight social version: we auto-pick a different color for each person and give you ready-to-share invite links tied to the same place and dates.
                </p>
              </div>

              <div className="w-full sm:w-44">
                <label className="field-label" htmlFor="group_size">
                  Group size
                </label>
                <select
                  id="group_size"
                  className="field-input"
                  value={groupSize}
                  onChange={(event) => {
                    const nextValue = Number(event.target.value);
                    setGroupSize(nextValue);
                    trackEvent({
                      eventName: "group_size_changed",
                      metadata: {
                        groupSize: nextValue,
                      },
                    });
                  }}
                >
                  {Array.from({ length: Math.min(missionSeeds.length, 8) }, (_, index) => index + 2).map((size) => (
                    <option key={size} value={size}>
                      {size} people
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-3 sm:flex-row">
              <button
                className="button-secondary w-full sm:w-auto"
                type="button"
                onClick={() => {
                  setGroupSeedOffset((current) => current + 1);
                  trackEvent({
                    eventName: "group_assignments_regenerated",
                    metadata: {
                      groupSize,
                    },
                  });
                }}
              >
                Shuffle colors
              </button>
            </div>

            <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {assignments.map((assignment) => {
                const isHostColor = selectedColor === assignment.colorName;
                const label = assignment.slot === 0 ? "You" : `Player ${assignment.slot + 1}`;

                return (
                  <div
                    key={`${assignment.slot}-${assignment.colorName}`}
                    className="rounded-[1.25rem] border border-[rgba(53,37,30,0.08)] bg-white/70 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{label}</p>
                        <h3 className="mt-2 text-lg font-semibold text-[var(--ink)]">{assignment.colorName}</h3>
                      </div>
                      <span
                        aria-hidden="true"
                        className="h-4 w-4 rounded-full border border-[rgba(53,37,30,0.1)]"
                        style={{ backgroundColor: assignment.colorHex }}
                      />
                    </div>

                    <p className="body-copy mt-3 text-sm">{assignment.prompt}</p>

                    <div className="mt-4 flex flex-col gap-2">
                      <button
                        className={`${isHostColor ? "button-primary" : "button-secondary"} w-full`}
                        type="button"
                        onClick={() => {
                          setSelectedColor(assignment.colorName);
                          trackEvent({
                            eventName: "group_assignment_claimed_for_host",
                            metadata: {
                              colorName: assignment.colorName,
                              slot: assignment.slot + 1,
                            },
                          });
                        }}
                      >
                        {isHostColor ? "Assigned to your trip" : "Use this color for my trip"}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="body-copy mt-4 text-xs sm:text-sm">
              Create the group hunt first, then we&apos;ll give you real invite links for each assigned seat.
            </p>
          </div>
        ) : null}

        <button className="button-primary mt-2 w-full sm:w-fit" type="submit">
          {huntMode === "group" ? "Create group hunt" : "Create the trip"}
        </button>
      </form>

    </>
  );
}
