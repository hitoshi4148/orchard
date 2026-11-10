import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { DailyWeatherRecord, HourlyWeatherRecord } from "../disease/nasa-power";
import { computeMarssoninaGddEstimate } from "./marssonina-gdd";
import { MARSSONINA_GDD_THRESHOLD_DAYC } from "./marssonina-constants";

function daily(date: string, avg: number): DailyWeatherRecord {
  return {
    date,
    temperature_avg: avg,
    humidity_avg: 70,
    temperature_max: avg + 2,
    temperature_min: avg - 2,
    precipitation_mm: 0,
  };
}

function metHour(date: string, hour: number, temp: number): HourlyWeatherRecord {
  return {
    datetime: `${date}T${String(hour).padStart(2, "0")}:00:00+09:00`,
    temperature: temp,
    humidity: 70,
    precipitation_mm: 0,
  };
}

describe("marssonina-gdd P3", () => {
  it("reaches threshold in measured data only", () => {
    const infection = "2026-05-01";
    const gddStart = "2026-05-01";
    const yesterday = "2026-05-10";
    const today = "2026-05-11";
    const records: DailyWeatherRecord[] = [];
    for (let i = 0; i < 10; i++) {
      const d = `2026-05-${String(1 + i).padStart(2, "0")}`;
      records.push(daily(d, 23));
    }
    const res = computeMarssoninaGddEstimate(
      infection,
      records,
      [],
      yesterday,
      today
    );
    assert.equal(res.gddStartDate, gddStart);
    assert.ok(res.measuredGddDayC >= MARSSONINA_GDD_THRESHOLD_DAYC);
    assert.equal(res.thresholdReachedInMeasured, true);
    assert.equal(res.onsetSource, "measured");
    assert.ok(res.estimatedOnsetDate);
    assert.equal(res.forecastGddDayC, 0);
  });

  it("reaches threshold within MET forecast period", () => {
    const infection = "2026-05-01";
    const yesterday = "2026-05-05";
    const today = "2026-05-06";
    const records = [
      daily("2026-05-01", 15),
      daily("2026-05-02", 15),
      daily("2026-05-03", 15),
      daily("2026-05-04", 15),
      daily("2026-05-05", 15),
    ];
    const forecast: HourlyWeatherRecord[] = [];
    for (let d = 6; d <= 20; d++) {
      const date = `2026-05-${String(d).padStart(2, "0")}`;
      for (let h = 0; h < 24; h++) {
        forecast.push(metHour(date, h, 25));
      }
    }
    const res = computeMarssoninaGddEstimate(
      infection,
      records,
      forecast,
      yesterday,
      today
    );
    assert.equal(res.thresholdReachedInMeasured, false);
    assert.equal(res.thresholdReachedInForecast, true);
    assert.equal(res.onsetSource, "forecast");
    assert.ok(res.estimatedOnsetDate && res.estimatedOnsetDate >= today);
  });

  it("does not extrapolate beyond forecast when threshold not reached", () => {
    const infection = "2026-06-01";
    const yesterday = "2026-06-03";
    const today = "2026-06-04";
    const records = [
      daily("2026-06-01", 10),
      daily("2026-06-02", 10),
      daily("2026-06-03", 10),
    ];
    const forecast = [metHour("2026-06-04", 12, 12)];
    const res = computeMarssoninaGddEstimate(
      infection,
      records,
      forecast,
      yesterday,
      today
    );
    assert.equal(res.thresholdReached, false);
    assert.match(res.predictedOnsetWindow, /予報期間内では.*到達せず/);
    assert.equal(res.estimatedOnsetDate, null);
  });

  it("tracks missing days without treating as zero gdd", () => {
    const infection = "2026-07-01";
    const yesterday = "2026-07-21";
    const today = "2026-07-22";
    const records: DailyWeatherRecord[] = [];
    for (let d = 1; d <= 21; d += 1) {
      if (d === 5 || d === 12) continue;
      records.push(daily(`2026-07-${String(d).padStart(2, "0")}`, 20));
    }
    const res = computeMarssoninaGddEstimate(
      infection,
      records,
      [],
      yesterday,
      today
    );
    assert.equal(res.missingDailyCount, 2);
    assert.equal(res.measuredGddDayC, 292.6);
    assert.equal(res.dataQuality, "degraded");
  });

  it("marks insufficient when many measured days missing", () => {
    const infection = "2026-08-01";
    const yesterday = "2026-08-15";
    const today = "2026-08-16";
    const records = [daily("2026-08-10", 18)];
    const res = computeMarssoninaGddEstimate(
      infection,
      records,
      [],
      yesterday,
      today
    );
    assert.equal(res.dataQuality, "insufficient");
    assert.match(res.predictedOnsetWindow, /予測データ不足/);
  });
});
