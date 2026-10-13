"""Generates src/theme/themes.css from theme-factory palettes (Ocean Depths, Arctic Frost,
Modern Minimalist, Tech Innovation). Re-run after editing a palette: python3 scripts/gen-themes.py"""
import colorsys, pathlib

CHART_LIGHT = dict(ink="#1A2332", demand="#D2603A", pos="#2E8F5E", neg="#C8414B", warn="#B97F0F",
  buy="#2D8B8B", sell="#D69A3A", accent="#2D8B8B", muted="#8A9AA6", c_state="#74838F", c_isgs="#3D6FA6",
  c_ipp="#8C7FB8", c_hydro="#4CA6BE", c_wind="#62B794", c_solar="#E3AE3A", c_store="#C4648F")
CHART_DARK = dict(ink="#E6F0EC", demand="#F08A5D", pos="#4FC48A", neg="#EE6A6F", warn="#F0B64A",
  buy="#5EC0BC", sell="#F0B64A", accent="#5EC0BC", muted="#7F93A2", c_state="#8C9AA6", c_isgs="#5A8FCC",
  c_ipp="#A79CD2", c_hydro="#5DBFD3", c_wind="#7FD3B0", c_solar="#F2C257", c_store="#DB7FA8")
SOFT_LIGHT = dict(pos_soft="#DDF1E6", neg_soft="#F8E1E2", warn_soft="#F8EDD3", info_soft="#E1EDF4")
SOFT_DARK = dict(pos_soft="#173528", neg_soft="#3D1F24", warn_soft="#3A2F15", info_soft="#1C2D3D")

P = {
 "ocean": {
  "light": dict(background="#EEF4F1", foreground="#1A2332", card="#FFFFFF", muted="#E3ECE9", muted_fg="#536676",
    border="#CDDCD8", primary="#237574", primary_fg="#F1FAEE", accent="#D3ECEA", accent_fg="#1A2332",
    sidebar="#1A2332", sidebar_fg="#DCEBE8", sidebar_muted="#8FA7B0", sidebar_active="#2D8B8B", seafoam="#A8DADC"),
  "dark": dict(background="#111923", foreground="#E6F0EC", card="#1A2332", muted="#212D3C", muted_fg="#93A6B4",
    border="#2C3A4B", primary="#5EC0BC", primary_fg="#0F1A20", accent="#1F3B42", accent_fg="#E6F0EC",
    sidebar="#0C121A", sidebar_fg="#DCEBE8", sidebar_muted="#7D95A0", sidebar_active="#2D8B8B", seafoam="#A8DADC"),
  "chart": {}, },
 "arctic": {
  "light": dict(background="#F2F6FA", foreground="#1C2A3D", card="#FFFFFF", muted="#E5ECF4", muted_fg="#56677E",
    border="#D2DDEA", primary="#4A6FA5", primary_fg="#FAFAFA", accent="#D4E4F7", accent_fg="#1C2A3D",
    sidebar="#24364F", sidebar_fg="#E3ECF7", sidebar_muted="#9DB0C8", sidebar_active="#4A6FA5", seafoam="#D4E4F7"),
  "dark": dict(background="#10161F", foreground="#E4ECF6", card="#18222F", muted="#1F2B3A", muted_fg="#93A3B8",
    border="#2A3647", primary="#86A8DA", primary_fg="#0F1620", accent="#213349", accent_fg="#E4ECF6",
    sidebar="#0B1118", sidebar_fg="#E3ECF7", sidebar_muted="#8395AC", sidebar_active="#4A6FA5", seafoam="#D4E4F7"),
  "chart": dict(light=dict(buy="#4A6FA5", accent="#4A6FA5"), dark=dict(buy="#86A8DA", accent="#86A8DA")), },
 "minimal": {
  "light": dict(background="#F3F4F5", foreground="#22303A", card="#FFFFFF", muted="#E8EAEC", muted_fg="#5D6974",
    border="#D3D7DB", primary="#36454F", primary_fg="#FFFFFF", accent="#E0E4E7", accent_fg="#22303A",
    sidebar="#36454F", sidebar_fg="#EEF1F3", sidebar_muted="#AAB4BC", sidebar_active="#708090", seafoam="#D3D3D3"),
  "dark": dict(background="#14181B", foreground="#E8ECEF", card="#1E2429", muted="#262D33", muted_fg="#9AA5AE",
    border="#323A41", primary="#C9D2D9", primary_fg="#14181B", accent="#2A3238", accent_fg="#E8ECEF",
    sidebar="#0F1214", sidebar_fg="#EEF1F3", sidebar_muted="#8A959E", sidebar_active="#708090", seafoam="#D3D3D3"),
  "chart": dict(light=dict(buy="#36454F", accent="#36454F"), dark=dict(buy="#C9D2D9", accent="#C9D2D9")), },
 "tech": {
  "dark": dict(background="#141414", foreground="#F2F5F7", card="#1E1E1E", muted="#262626", muted_fg="#9AA3AB",
    border="#333333", primary="#3D85FF", primary_fg="#FFFFFF", accent="#0E2A4D", accent_fg="#F2F5F7",
    sidebar="#0B0D10", sidebar_fg="#E6EEF5", sidebar_muted="#7E8A96", sidebar_active="#0066FF", seafoam="#00FFFF"),
  "chart": dict(dark=dict(buy="#3D85FF", accent="#22D3DD")), },
}

def hsl(h):
    h = h.lstrip("#"); r, g, b = (int(h[i:i+2], 16) / 255 for i in (0, 2, 4))
    hh, l, s = colorsys.rgb_to_hls(r, g, b)
    return f"{hh*360:.1f} {s*100:.1f}% {l*100:.1f}%"

def block(p, mode, extra_chart):
    c = dict(CHART_LIGHT if mode == "light" else CHART_DARK); c.update(extra_chart or {})
    soft = SOFT_LIGHT if mode == "light" else SOFT_DARK
    out = [
      f"--background:{hsl(p['background'])}", f"--foreground:{hsl(p['foreground'])}",
      f"--card:{hsl(p['card'])}", f"--card-foreground:{hsl(p['foreground'])}",
      f"--popover:{hsl(p['card'])}", f"--popover-foreground:{hsl(p['foreground'])}",
      f"--primary:{hsl(p['primary'])}", f"--primary-foreground:{hsl(p['primary_fg'])}",
      f"--secondary:{hsl(p['muted'])}", f"--secondary-foreground:{hsl(p['foreground'])}",
      f"--muted:{hsl(p['muted'])}", f"--muted-foreground:{hsl(p['muted_fg'])}",
      f"--accent:{hsl(p['accent'])}", f"--accent-foreground:{hsl(p['accent_fg'])}",
      f"--destructive:{hsl(c['neg'])}", f"--destructive-foreground:0 0% 100%",
      f"--border:{hsl(p['border'])}", f"--input:{hsl(p['border'])}", f"--ring:{hsl(p['primary'])}",
      f"--sidebar:{p['sidebar']}", f"--sidebar-fg:{p['sidebar_fg']}", f"--sidebar-muted:{p['sidebar_muted']}",
      f"--sidebar-active:{p['sidebar_active']}", f"--seafoam:{p['seafoam']}",
      f"color-scheme:{mode}",
    ]
    out += [f"--ch-{k.replace('_','-')}:{v}" for k, v in c.items()]
    out += [f"--{k.replace('_','-')}:{v}" for k, v in soft.items()]
    return ";".join(out) + ";"

css = ["/* Generated by scripts/gen-themes.py — theme-factory palettes. Do not edit by hand. */"]
for name in ("ocean", "arctic", "minimal"):
    t = P[name]; ch = t.get("chart", {})
    sel = ":root" if name == "ocean" else f':root[data-palette="{name}"]'
    css.append(f"{sel}{{{block(t['light'],'light',ch.get('light'))}}}")
    css.append(f"@media (prefers-color-scheme: dark){{{sel}:not([data-theme=\"light\"]){{{block(t['dark'],'dark',ch.get('dark'))}}}}}")
    css.append(f"{sel}[data-theme=\"dark\"]{{{block(t['dark'],'dark',ch.get('dark'))}}}")
# Tech Innovation is dark-only; repeated attribute raises specificity above the mode rules.
t = P["tech"]
css.append(f':root[data-palette="tech"][data-palette="tech"][data-palette="tech"]{{{block(t["dark"],"dark",t["chart"]["dark"])}}}')
pathlib.Path(__file__).resolve().parent.parent.joinpath("src/theme/themes.css").write_text("\n".join(css) + "\n")
print("wrote themes.css")
