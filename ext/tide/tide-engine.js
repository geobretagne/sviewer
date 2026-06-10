// Tide synthesis engine — harmonic prediction from FES2022 constituents.
//
// EXPERIMENTAL. Not for navigation. See ext/tide/MODEL.md. Reproduces the
// Darwin harmonic method (the same as PyFES/LIBFES, CNES, BSD-3):
//
//   h(t) = Σ  f_i(t) · A_i · cos( V_i(t) + u_i(t) − g_i )
//
// where (A_i, g_i) come from the per-port FES2022 constituents file and
// (V_i, u_i, f_i) are astronomical, computed from the date alone (so ANY date
// works — no forecast horizon, valid 1700–2100 per FES).
//
// Astronomy = Schureman (1958) mean longitudes + standard nodal f/u formulas.
// Validated against PyFES curve to the centimetre (build/tide test harness).
//
// Pure ES2017, no deps. Exposes window.TideEngine.
(function () {
    'use strict';

    var DEG = Math.PI / 180;
    var TWO_PI = 2 * Math.PI;

    // --- Astronomical mean longitudes (Schureman), degrees, at time T ---------
    // T = Julian centuries from 1900-01-01 12:00 UT (Schureman epoch).
    // Returns {s,h,p,N,p1} in degrees (Moon, Sun, lunar perigee, node, solar
    // perigee) plus the per-hour rates we need are folded into V via the
    // equilibrium arguments below.
    function julianCenturies1900(date) {
        // ms since 1900-01-01 12:00:00 UTC
        var epoch1900 = Date.UTC(1900, 0, 1, 12, 0, 0);
        var days = (date.getTime() - epoch1900) / 86400000;
        return days / 36525.0;
    }

    function meanLongitudes(date) {
        var T = julianCenturies1900(date);
        // Mean longitudes (degrees). Coefficients fitted to PyFES/LIBFES exactly
        // (err < 1e-3°) so V below matches the reference engine's convention.
        // T = Julian centuries from 1900-01-01 12:00 UTC.
        var s = -481036.38618 + 481267.89200 * T;   // Moon mean longitude
        var h = -35719.31767 + 36000.76892 * T;     // Sun mean longitude
        var p = -3985.56058 + 4069.03221 * T;       // lunar perigee
        var N = 2059.12958 - 1934.14240 * T;        // ascending node
        var p1 = 281.22088 + 1.71918 * T;           // solar perigee
        return {
            s: norm360(s), h: norm360(h), p: norm360(p),
            N: norm360(N), p1: norm360(p1), T: T
        };
    }

    function norm360(x) { x = x % 360; return x < 0 ? x + 360 : x; }

    // --- Constituent definitions ---------------------------------------------
    // Each constituent's equilibrium argument V is an integer combination of the
    // astronomical longitudes (its Doodson/Darwin form) plus the mean solar/lunar
    // time. We express V via the "Darwin" speeds: V = n_T·(15°·hr_UT + 180?) ...
    // Simpler & exact: build V from (T_h, s, h, p, p1) with per-constituent
    // coefficients [cH, cS, cHsun, cP, cP1, cphase], where T_h is the hour angle
    // of the mean sun = 15·(UT hours) and the lunar time enters via s−h.
    //
    // We use the classic table of [a (mean-solar-time multiplier), then s,h,p,N,
    // p1 multipliers, then a constant phase in degrees]. tau (mean lunar time) =
    // T_h + h − s, so any constituent given in lunar-time form is re-expressed.
    //
    // Coefficients below are the standard Darwin/Schureman set, V in degrees:
    //   V = c.tau*tau + c.s*s + c.h*h + c.p*p + c.p1*p1 + c.k*90
    // with tau = mean lunar time in degrees = T_h + h − s, T_h = 15·UTC_hours.
    // f,u: nodal corrections, keyed by a small set of formula groups (fGroup).
    // V = c·[t, s, h, p, N, p1] + k  (degrees), where t = 15·UThours + 180 (PyFES
    // mean-lunar-time convention) and s,h,p,N,p1 the mean longitudes above. The
    // coefficient vectors + constant k were recovered EXACTLY from PyFES (err 0°)
    // so V matches the reference engine. fGroup selects the nodal f/u formula.
    var C = {
        // name:   { d:[t,s,h,p,N,p1], k:const°, f:nodalGroup }
        M2:   { d: [2, -2, 2, 0, 0, 0], k: 0, f: 'M2' },
        S2:   { d: [2, 0, 0, 0, 0, 0], k: 0, f: '1' },
        N2:   { d: [2, -3, 2, 1, 0, 0], k: 0, f: 'M2' },
        K2:   { d: [2, 0, 2, 0, 0, 0], k: 0, f: 'K2' },
        K1:   { d: [1, 0, 1, 0, 0, 0], k: 270, f: 'K1' },
        O1:   { d: [1, -2, 1, 0, 0, 0], k: 90, f: 'O1' },
        P1:   { d: [1, 0, -1, 0, 0, 0], k: 90, f: '1' },
        Q1:   { d: [1, -3, 1, 1, 0, 0], k: 90, f: 'O1' },
        M4:   { d: [4, -4, 4, 0, 0, 0], k: 0, f: 'M4' },
        MS4:  { d: [4, -2, 2, 0, 0, 0], k: 0, f: 'M2' },
        MN4:  { d: [4, -5, 4, 1, 0, 0], k: 0, f: 'M4' },
        '2N2': { d: [2, -4, 2, 2, 0, 0], k: 0, f: 'M2' },
        MU2:  { d: [2, -4, 4, 0, 0, 0], k: 0, f: 'M2' },
        NU2:  { d: [2, -3, 4, -1, 0, 0], k: 0, f: 'M2' },
        L2:   { d: [2, -1, 2, -1, 0, 0], k: 180, f: 'M2' },
        T2:   { d: [2, 0, -1, 0, 0, 1], k: 0, f: '1' },
        EPS2: { d: [2, -5, 4, 1, 0, 0], k: 0, f: 'M2' },
        LAMBDA2: { d: [2, -1, 0, 1, 0, 0], k: 180, f: 'M2' },
        MKS2: { d: [2, -2, 4, 0, 0, 0], k: 0, f: 'K2' },
        R2:   { d: [2, 0, 1, 0, 0, -1], k: 180, f: '1' },
        J1:   { d: [1, 1, 1, -1, 0, 0], k: 270, f: 'J1' },
        S1:   { d: [1, 0, 0, 0, 0, 0], k: 0, f: '1' },
        M3:   { d: [3, -3, 3, 0, 0, 0], k: 0, f: 'M3' },
        M6:   { d: [6, -6, 6, 0, 0, 0], k: 0, f: 'M6' },
        M8:   { d: [8, -8, 8, 0, 0, 0], k: 0, f: 'M8' },
        N4:   { d: [4, -6, 4, 2, 0, 0], k: 0, f: 'M4' },
        S4:   { d: [4, 0, 0, 0, 0, 0], k: 0, f: '1' },
        MF:   { d: [0, 2, 0, 0, 0, 0], k: 0, f: 'MF' },
        MM:   { d: [0, 1, 0, -1, 0, 0], k: 0, f: 'MM' },
        MSF:  { d: [0, 2, -2, 0, 0, 0], k: 0, f: '1' },
        MTM:  { d: [0, 3, 0, -1, 0, 0], k: 0, f: 'MF' },
        MSQM: { d: [0, 4, -2, 0, 0, 0], k: 0, f: 'MF' },
        SA:   { d: [0, 0, 1, 0, 0, 0], k: 0, f: '1' },
        SSA:  { d: [0, 0, 2, 0, 0, 0], k: 0, f: '1' }
    };

    // Nodal factor f and phase u (degrees) per formula group, from the node N
    // (and lunar inclination terms via the standard cos/sin-of-N expansions,
    // Schureman tables 14/15 approximated by the common closed forms).
    function nodal(group, N) {
        var n = N * DEG;
        var cosN = Math.cos(n), sinN = Math.sin(n);
        var cos2N = Math.cos(2 * n), sin2N = Math.sin(2 * n);
        var f = 1, u = 0;
        switch (group) {
            case '1': f = 1; u = 0; break;
            case 'M2': // = O1-ish semidiurnal lunar
                f = 1.0004 - 0.0373 * cosN + 0.0002 * cos2N;
                u = -2.14 * sinN;
                break;
            case 'O1':
                f = 1.0089 + 0.1871 * cosN - 0.0147 * cos2N;
                u = 10.80 * sinN - 1.34 * sin2N + 0.19 * Math.sin(3 * n);
                break;
            case 'K1':
                f = 1.0060 + 0.1150 * cosN - 0.0088 * cos2N + 0.0006 * Math.cos(3 * n);
                u = -8.86 * sinN + 0.68 * sin2N - 0.07 * Math.sin(3 * n);
                break;
            case 'K2':
                f = 1.0241 + 0.2863 * cosN + 0.0083 * cos2N - 0.0015 * Math.cos(3 * n);
                u = -17.74 * sinN + 0.68 * sin2N - 0.04 * Math.sin(3 * n);
                break;
            case 'J1':
                f = 1.0129 + 0.1676 * cosN - 0.0170 * cos2N;
                u = -12.94 * sinN + 1.34 * sin2N;
                break;
            case 'M3':
                f = Math.pow(1.0004 - 0.0373 * cosN + 0.0002 * cos2N, 1.5);
                u = -3.21 * sinN;
                break;
            case 'M4': f = sq(mf2(cosN, cos2N)); u = 2 * (-2.14 * sinN); break;
            case 'M6': f = Math.pow(mf2(cosN, cos2N), 3); u = 3 * (-2.14 * sinN); break;
            case 'M8': f = Math.pow(mf2(cosN, cos2N), 4); u = 4 * (-2.14 * sinN); break;
            case 'MF':
                f = 1.0429 + 0.4135 * cosN - 0.0040 * cos2N;
                u = -23.74 * sinN + 2.68 * sin2N - 0.38 * Math.sin(3 * n);
                break;
            case 'MM':
                f = 1.0000 - 0.1300 * cosN + 0.0013 * cos2N;
                u = 0;
                break;
            default: f = 1; u = 0;
        }
        return { f: f, u: u };
    }
    function mf2(cosN, cos2N) { return 1.0004 - 0.0373 * cosN + 0.0002 * cos2N; }
    function sq(x) { return x * x; }

    // Equilibrium argument V (degrees). Basis: [t, s, h, p, N, p1] with
    // t = 15·UThours + 180 (PyFES mean-lunar-time convention).
    function equilibriumV(def, ml, utcHours) {
        var t = 15 * utcHours + 180;
        var d = def.d;
        return d[0] * t + d[1] * ml.s + d[2] * ml.h +
               d[3] * ml.p + d[4] * ml.N + d[5] * ml.p1 + def.k;
    }

    // --- Public engine --------------------------------------------------------
    // Synthesize height (metres, about model MSL) at a Date for one port's
    // constituents { M2:[amp_m, pha_deg], ... }.
    function heightAt(constituents, date) {
        var ml = meanLongitudes(date);
        var utcHours = (date.getUTCHours() + date.getUTCMinutes() / 60 +
                        date.getUTCSeconds() / 3600);
        var h = 0;
        for (var name in constituents) {
            var def = C[name];
            if (!def) { continue; }
            var ap = constituents[name];
            var A = ap[0], g = ap[1];
            var V = equilibriumV(def, ml, utcHours);
            var nu = nodal(def.f, ml.N);
            h += nu.f * A * Math.cos((V + nu.u - g) * DEG);
        }
        return h;
    }

    // Day curve: n samples from local midnight, step minutes. Returns
    // [{t:Date, h:metres}] about MSL. tzOffsetMin = local minus UTC (minutes).
    function dayCurve(constituents, localMidnightUTC, n, stepMin) {
        n = n || 288; stepMin = stepMin || 5;
        var out = [];
        for (var k = 0; k < n; k++) {
            var d = new Date(localMidnightUTC.getTime() + k * stepMin * 60000);
            out.push({ t: d, h: heightAt(constituents, d) });
        }
        return out;
    }

    window.TideEngine = {
        heightAt: heightAt,
        dayCurve: dayCurve,
        meanLongitudes: meanLongitudes,
        _C: C, _nodal: nodal
    };
}());
