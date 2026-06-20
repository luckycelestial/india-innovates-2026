import re

file_path = "app/admin/crime-intelligence/page.tsx"

with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Define the replacement list (tuple of target string, replacement string)
replacements = [
    # General layout
    (
        "style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}",
        "className=\"absolute inset-0 flex flex-col\""
    ),
    (
        "style={{\n        position: 'absolute',\n        bottom: '20px',\n        left: '20px',\n        zIndex: 1000,\n        background: '#ffffff',\n        border: '1px solid #dadad3',\n        borderRadius: '16px',\n        padding: '12px 16px',\n        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',\n        width: '150px',\n        fontFamily: FONT_SANS\n      }}",
        "className=\"absolute bottom-5 left-5 z-[1000] bg-white border border-[#dadad3] rounded-2xl p-3 shadow-md w-[150px] font-sans\""
    ),
    (
        "style={{ fontSize: '11px', fontWeight: 700, color: '#262622', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}",
        "className=\"text-[11px] font-bold text-[#262622] mb-2 uppercase tracking-[0.5px]\""
    ),
    (
        "style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '11px', fontWeight: 600, color: '#262622' }}",
        "className=\"flex items-center gap-2 text-[11px] font-semibold text-[#262622]\""
    ),
    (
        "style={{ width: '8px', height: '8px', borderRadius: '50%', background: item.color }}",
        "className=\"w-2 h-2 rounded-full\" style={{ background: item.color }}"
    ),
    (
        "style={{\n        position: 'absolute',\n        bottom: '20px',\n        right: '20px',\n        zIndex: 1000,\n        background: '#ffffff',\n        border: '1px solid #dadad3',\n        borderRadius: '16px',\n        padding: '8px 12px',\n        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',\n        display: 'flex',\n        alignItems: 'center',\n        gap: '6px',\n        fontFamily: FONT_SANS,\n        fontSize: '11px',\n        color: '#262622',\n        fontWeight: 600\n      }}",
        "className=\"absolute bottom-5 right-5 z-[1000] bg-white border border-[#dadad3] rounded-2xl py-2 px-3 shadow-md flex items-center gap-1.5 font-sans text-[11px] text-[#262622] font-semibold\""
    ),
    # KPI card
    (
        "style={{\n      background: '#ffffff',\n      border: '1px solid #dadad3',\n      borderRadius: '16px',\n      padding: '20px',\n      display: 'flex',\n      alignItems: 'center',\n      gap: '16px',\n      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'\n    }}",
        "className=\"bg-white border border-[#dadad3] rounded-2xl p-5 flex items-center gap-4 shadow-sm\""
    ),
    (
        "style={{ background: `${color}15`, color: color, padding: '12px', borderRadius: '16px' }}",
        "className=\"p-3 rounded-2xl\" style={{ background: `${color}15`, color: color }}"
    ),
    (
        "style={{ fontSize: '12px', fontWeight: 600, color: '#262622', textTransform: 'uppercase', letterSpacing: '0.5px' }}",
        "className=\"text-xs font-semibold text-[#262622] uppercase tracking-[0.5px]\""
    ),
    (
        "style={{ fontSize: '24px', fontWeight: 700, color: '#000000', margin: '2px 0' }}",
        "className=\"text-2xl font-bold text-black my-0.5\""
    ),
    (
        "style={{ fontSize: '11px', color: '#94a3b8' }}",
        "className=\"text-[11px] text-slate-400\""
    ),
    # Main container
    (
        "style={{ minHeight: '100vh', background: '#f6f6f3', padding: '40px 24px', fontFamily: FONT_SANS }}",
        "className=\"min-h-screen bg-[#f6f6f3] py-10 px-6 font-sans\""
    ),
    (
        "style={{ maxWidth: '1280px', margin: '0 auto' }}",
        "className=\"max-w-7xl mx-auto\""
    ),
    (
        "style={{\n          display: 'flex',\n          justifyContent: 'space-between',\n          alignItems: 'center',\n          flexWrap: 'wrap',\n          gap: '16px',\n          marginBottom: '24px'\n        }}",
        "className=\"flex justify-between items-center flex-wrap gap-4 mb-6\""
    ),
    (
        "style={{ display: 'flex', alignItems: 'center', gap: '8px' }}",
        "className=\"flex items-center gap-2\""
    ),
    (
        "style={{ fontSize: '13px', fontWeight: 600, color: '#262622' }}",
        "className=\"text-[13px] font-semibold text-[#262622]\""
    ),
    (
        "style={{\n                height: '40px',\n                padding: '0 32px 0 16px',\n                borderRadius: '16px',\n                border: '1px solid #dadad3',\n                fontSize: '14px',\n                fontWeight: 700,\n                color: '#000000',\n                background: '#ffffff',\n                cursor: 'pointer',\n                boxShadow: '0 1px 2px rgba(0,0,0,0.05)',\n                outline: 'none',\n                appearance: 'none',\n                backgroundImage: 'url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%230f172a\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpolyline points=\\'6 9 12 15 18 9\\'%3E%3C/polyline%3E%3C/svg%3E\")',\n                backgroundRepeat: 'no-repeat',\n                backgroundPosition: 'right 12px center',\n                backgroundSize: '16px'\n              }}",
        "className=\"h-10 pl-4 pr-8 rounded-2xl border border-[#dadad3] text-sm font-bold text-black bg-white cursor-pointer shadow-sm outline-none appearance-none\" style={{ backgroundImage: 'url(\"data:image/svg+xml;charset=UTF-8,%3Csvg xmlns=\\'http://www.w3.org/2000/svg\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'%230f172a\\' stroke-width=\\'2\\' stroke-linecap=\\'round\\' stroke-linejoin=\\'round\\'%3E%3Cpolyline points=\\'6 9 12 15 18 9\\'%3E%3C/polyline%3E%3C/svg%3E\")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center', backgroundSize: '16px' }}"
    ),
    # Category list grid
    (
        "style={{\n          display: 'grid',\n          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',\n          gap: '16px',\n          marginBottom: '24px'\n        }}",
        "className=\"grid grid-cols-[repeat(auto-fit,minmax(200px,1fr))] gap-4 mb-6\""
    ),
    (
        "style={{\n                  background: '#ffffff',\n                  border: '1.5px solid #dadad3',\n                  borderRadius: '16px',\n                  padding: '16px 20px',\n                  display: 'flex',\n                  flexDirection: 'column',\n                  gap: '4px',\n                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)',\n                  textAlign: 'left'\n                }}",
        "className=\"bg-white border-1.5 border-[#dadad3] rounded-2xl py-4 px-5 flex flex-col gap-1 shadow-sm text-left\""
    ),
    (
        "style={{ fontSize: '11px', fontWeight: 700, color: '#555550', textTransform: 'uppercase', letterSpacing: '0.5px' }}",
        "className=\"text-[11px] font-bold text-[#555550] uppercase tracking-[0.5px]\""
    ),
    (
        "style={{ fontSize: '24px', fontWeight: 800, color: '#000000', margin: '4px 0', fontFamily: FONT_DISPLAY }}",
        "className=\"text-2xl font-extrabold text-black my-1 font-display\""
    ),
    (
        "style={{ fontSize: '11px', color: '#64748B', fontWeight: 500 }}",
        "className=\"text-[11px] text-[#64748B] font-medium\""
    ),
    # Alert banner
    (
        "style={{\n            background: '#fee2e2',\n            border: '1px solid #fca5a5',\n            padding: '16px 20px',\n            marginBottom: '24px',\n            display: 'flex',\n            alignItems: 'center',\n            gap: '12px',\n            color: '#b91c1c'\n          }}",
        "className=\"bg-[#fee2e2] border border-[#fca5a5] py-4 px-5 mb-6 flex items-center gap-3 text-[#b91c1c]\""
    ),
    (
        "style={{ fontSize: '13px', fontWeight: 700 }}",
        "className=\"text-[13px] font-bold\""
    ),
    (
        "style={{\n              marginLeft: 'auto',\n              background: '#ef4444',\n              color: '#fff',\n              fontSize: '10px',\n              fontWeight: 700,\n              padding: '2px 8px',\n              borderRadius: '20px',\n              animation: 'pulse 1.5s infinite'\n            }}",
        "className=\"ml-auto bg-[#ef4444] text-white text-[10px] font-bold py-0.5 px-2 rounded-full animate-pulse\""
    ),
    # Grid split
    (
        "style={{\n          display: 'flex',\n          flexWrap: 'wrap',\n          gap: '24px',\n          marginBottom: '16px',\n          width: '100%'\n        }}",
        "className=\"flex flex-wrap gap-6 mb-4 w-full\""
    ),
    # Left Map Card
    (
        "style={{\n            background: '#ffffff',\n            borderRadius: '16px',\n            border: '1px solid #dadad3',\n            padding: '24px',\n            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',\n            display: 'flex',\n            flexDirection: 'column',\n            flex: '2 1 600px',\n            minWidth: '320px'\n          }}",
        "className=\"bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col flex-[2_1_600px] min-w-[320px]\""
    ),
    (
        "style={{ \n              flex: 1, \n              width: '100%', \n              background: '#f6f6f3', \n              borderRadius: '16px', \n              overflow: 'hidden',\n              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',\n              border: '1px solid #dadad3',\n              position: 'relative',\n              minHeight: '760px',\n              display: 'flex',\n              flexDirection: 'column'\n            }}",
        "className=\"flex-1 w-full bg-[#f6f6f3] rounded-2xl overflow-hidden shadow-md border border-[#dadad3] relative min-h-[760px] flex flex-col\""
    ),
    # Right details card
    (
        "style={{\n            background: '#ffffff',\n            borderRadius: '16px',\n            border: '1px solid #dadad3',\n            padding: '24px',\n            boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',\n            display: 'flex',\n            flexDirection: 'column',\n            gap: '20px',\n            flex: '1 1 320px',\n            minWidth: '300px'\n          }}",
        "className=\"bg-white rounded-2xl border border-[#dadad3] p-6 shadow-sm flex flex-col gap-5 flex-[1_1_320px] min-w-[300px]\""
    ),
    (
        "style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}",
        "className=\"flex flex-col gap-5\""
    ),
    (
        "style={{\n                  background: '#dcfce7',\n                  color: '#6D9998',\n                  fontSize: '11px',\n                  fontWeight: 700,\n                  padding: '4px 10px',\n                  borderRadius: '20px'\n                }}",
        "className=\"bg-[#dcfce7] text-[#6D9998] text-[11px] font-bold py-1 px-2.5 rounded-full\""
    ),
    (
        "style={{ overflowX: 'auto', border: '1px solid #dadad3', borderRadius: '16px', background: '#ffffff', padding: '12px' }}",
        "className=\"overflow-x-auto border border-[#dadad3] rounded-2xl bg-white p-3\""
    ),
    (
        "style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '12px' }}",
        "className=\"w-full border-collapse text-left text-xs\""
    ),
    (
        "style={{ borderBottom: '1px solid #dadad3', color: '#555550', fontWeight: 700 }}",
        "className=\"border-b border-[#dadad3] text-[#555550] font-bold\""
    ),
    (
        "style={{ padding: '8px' }}",
        "className=\"p-2\""
    ),
    (
        "style={{ borderBottom: '1px solid #f6f6f3' }}",
        "className=\"border-b border-[#f6f6f3]\""
    ),
    (
        "style={{ padding: '8px', fontWeight: 700 }}",
        "className=\"p-2 font-bold\""
    ),
    (
        "style={{ padding: '8px', color: row.aqi > 100 ? '#ef4444' : '#7B8F65', fontWeight: 700 }}",
        "className=\"p-2 font-bold\" style={{ color: row.aqi > 100 ? '#ef4444' : '#7B8F65' }}"
    ),
    (
        "style={{\n                                fontSize: '10px',\n                                padding: '2px 6px',\n                                borderRadius: '4px',\n                                background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)',\n                                color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65',\n                                fontWeight: 700\n                              }}",
        "className=\"text-[10px] py-0.5 px-1.5 rounded font-bold\" style={{ background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)', color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65' }}"
    ),
    (
        "style={{\n                    height: '40px',\n                    borderRadius: '16px',\n                    border: 'none',\n                    background: '#36375D',\n                    color: '#FFFFFF',\n                    fontSize: '13px',\n                    fontWeight: 700,\n                    cursor: 'pointer',\n                    display: 'flex',\n                    alignItems: 'center',\n                    justifyContent: 'center',\n                    gap: '8px',\n                    boxShadow: '0 4px 12px rgba(54, 55, 93, 0.15)',\n                    transition: 'all 150ms'\n                  }}",
        "className=\"h-10 rounded-2xl border-none bg-[#36375D] text-white text-[13px] font-bold cursor-pointer flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(54,55,93,0.15)] transition-all duration-150\""
    ),
    # 3-column stats grid
    (
        "style={{\n                  display: 'flex',\n                  border: '1px solid #dadad3',\n                  borderRadius: '16px',\n                  background: '#ffffff',\n                  overflow: 'hidden',\n                  boxShadow: '0 1px 2px rgba(0,0,0,0.02)'\n                }}",
        "className=\"flex border border-[#dadad3] rounded-2xl bg-white overflow-hidden shadow-[0_1px_2px_rgba(0,0,0,0.02)]\""
    ),
    (
        "style={{ flex: 1, padding: '12px 10px', textAlign: 'center', borderRight: '1px solid #dadad3' }}",
        "className=\"flex-1 py-3 px-2.5 text-center border-r border-[#dadad3]\""
    ),
    (
        "style={{ flex: 1, padding: '12px 10px', textAlign: 'center' }}",
        "className=\"flex-1 py-3 px-2.5 text-center\""
    ),
    (
        "style={{\n                  display: 'flex',\n                  gap: '12px',\n                  width: '100%'\n                }}",
        "className=\"flex gap-3 w-full\""
    ),
    (
        "style={{\n                    flex: 1,\n                    border: '1px solid #dadad3',\n                    borderRadius: '16px',\n                    padding: '10px 12px',\n                    background: '#f6f6f3',\n                    display: 'flex',\n                    flexDirection: 'column',\n                    gap: '2px'\n                  }}",
        "className=\"flex-1 border border-[#dadad3] rounded-2xl p-2.5 bg-[#f6f6f3] flex flex-col gap-0.5\""
    ),
    (
        "style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', color: '#262622', fontWeight: 600 }}",
        "className=\"flex items-center gap-1 text-[11px] text-[#262622] font-semibold\""
    ),
    (
        "style={{ fontSize: '16px', fontWeight: 800, color: '#000000' }}",
        "className=\"text-base font-extrabold text-black\""
    ),
    (
        "style={{ fontSize: '16px', fontWeight: 800, color: '#ef4444' }}",
        "className=\"text-base font-extrabold text-red-500\""
    ),
    (
        "style={{ fontSize: '10px', color: '#6D9998', fontWeight: 600 }}",
        "className=\"text-[10px] text-[#6D9998] font-semibold\""
    ),
    (
        "style={{ fontSize: '10px', color: '#ef4444', fontWeight: 600 }}",
        "className=\"text-[10px] text-red-500 font-semibold\""
    ),
    (
        "style={{\n                  fontSize: '13px',\n                  fontWeight: 700,\n                  color: '#262622',\n                  marginBottom: '12px',\n                  textTransform: 'uppercase',\n                  letterSpacing: '0.5px'\n                }}",
        "className=\"text-[13px] font-bold text-[#262622] mb-3 uppercase tracking-[0.5px]\""
    ),
    (
        "style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}",
        "className=\"flex flex-col gap-2.5\""
    ),
    (
        "style={{ display: 'flex', alignItems: 'center', gap: '12px' }}",
        "className=\"flex items-center gap-3\""
    ),
    (
        "style={{ fontSize: '11px', fontWeight: 600, color: '#262622', width: '90px', textTransform: 'capitalize', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}",
        "className=\"text-[11px] font-semibold text-[#262622] w-[90px] capitalize whitespace-nowrap overflow-hidden text-ellipsis\""
    ),
    (
        "style={{ flex: 1, height: '8px', background: '#f6f6f3', borderRadius: '4px', overflow: 'hidden' }}",
        "className=\"flex-1 h-2 bg-[#f6f6f3] rounded-full overflow-hidden\""
    ),
    (
        "style={{ height: '100%', width: `${cat.pct}%`, background: cat.color, borderRadius: '4px' }}",
        "className=\"h-full rounded-full\" style={{ width: `${cat.pct}%`, background: cat.color }}"
    ),
    (
        "style={{ fontSize: '11px', fontWeight: 700, color: '#262622', width: '50px', textAlign: 'right' }}",
        "className=\"text-[11px] font-bold text-[#262622] w-[50px] text-right\""
    ),
    (
        "style={{ borderTop: '1px solid #dadad3', paddingTop: '16px' }}",
        "className=\"border-t border-[#dadad3] pt-4\""
    ),
    (
        "style={{\n                  display: 'flex',\n                  justifyContent: 'space-between',\n                  alignItems: 'center',\n                  marginBottom: '12px'\n                }}",
        "className=\"flex justify-between items-center mb-3\""
    ),
    (
        "style={{ fontSize: '10px', background: '#fee2e2', color: '#ef4444', padding: '2px 8px', borderRadius: '16px', fontWeight: 700 }}",
        "className=\"text-[10px] bg-[#fee2e2] text-red-500 py-0.5 px-2 rounded-full font-bold\""
    ),
    (
        "style={{ fontSize: '10px', background: '#dcfce7', color: '#6D9998', padding: '2px 8px', borderRadius: '16px', fontWeight: 700 }}",
        "className=\"text-[10px] bg-[#dcfce7] text-[#6D9998] py-0.5 px-2 rounded-full font-bold\""
    ),
    (
        "style={{ background: '#fee2e2', border: '1px solid #fca5a5', padding: '8px 12px', borderRadius: '12px', fontSize: '11px' }}",
        "className=\"bg-[#fee2e2] border border-[#fca5a5] p-3 rounded-xl text-[11px]\""
    ),
    (
        "style={{ fontWeight: 700, color: '#b91c1c' }}",
        "className=\"font-bold text-[#b91c1c]\""
    ),
    (
        "style={{ color: '#7f1d1d', marginTop: '2px' }}",
        "className=\"text-[#7f1d1d] mt-0.5\""
    ),
    (
        "style={{ color: '#991b1b', fontWeight: 600, fontSize: '10px', marginTop: '4px' }}",
        "className=\"text-[#991b1b] font-semibold text-[10px] mt-1\""
    ),
    (
        "style={{ background: '#f5f3ff', border: '1px solid #ddd6fe', padding: '10px 12px', borderRadius: '12px', fontSize: '11px' }}",
        "className=\"bg-[#f5f3ff] border border-[#ddd6fe] py-2.5 px-3 rounded-xl text-[11px]\""
    ),
    (
        "style={{ fontWeight: 700, color: '#6d28d9', display: 'flex', justifyContent: 'space-between' }}",
        "className=\"font-bold text-[#6d28d9] flex justify-between\""
    ),
    (
        "style={{ color: '#5b21b6', marginTop: '4px', lineHeight: 1.3 }}",
        "className=\"text-[#5b21b6] mt-1 leading-snug\""
    ),
    (
        "style={{ fontSize: '10px', color: '#6b7280', marginTop: '2px' }}",
        "className=\"text-[10px] text-gray-500 mt-0.5\""
    ),
    (
        "style={{\n                    marginTop: 'auto',\n                    width: '100%',\n                    height: '44px',\n                    background: '#e60023',\n                    color: '#ffffff',\n                    border: 'none',\n                    borderRadius: '16px',\n                    fontSize: '14px',\n                    fontWeight: 700,\n                    cursor: 'pointer',\n                    transition: 'all 120ms',\n                    display: 'flex',\n                    alignItems: 'center',\n                    justifyContent: 'center',\n                    gap: '6px'\n                  }}",
        "className=\"mt-auto w-full h-11 bg-[#e60023] text-white border-none rounded-2xl text-sm font-bold cursor-pointer transition-all duration-120 flex items-center justify-center gap-1.5\""
    ),
    # Footer and bottom tables
    (
        "style={{\n          display: 'flex',\n          justifyContent: 'space-between',\n          alignItems: 'center',\n          flexWrap: 'wrap',\n          gap: '16px',\n          marginTop: '8px',\n          marginBottom: '32px',\n          width: '100%'\n        }}",
        "className=\"flex justify-between items-center flex-wrap gap-4 mt-2 mb-8 w-full\""
    ),
    (
        "style={{\n            display: 'flex',\n            alignItems: 'center',\n            gap: '8px',\n            background: '#eff6ff',\n            color: '#1e3a8a',\n            padding: '10px 16px',\n            borderRadius: '16px',\n            fontSize: '12px',\n            fontWeight: 600\n          }}",
        "className=\"flex items-center gap-2 bg-[#eff6ff] text-[#1e3a8a] py-2.5 px-4 rounded-2xl text-xs font-semibold\""
    ),
    (
        "style={{\n              display: 'flex',\n              alignItems: 'center',\n              gap: '6px',\n              background: '#ffffff',\n              border: '1px solid #dadad3',\n              borderRadius: '16px',\n              padding: '10px 16px',\n              fontSize: '12px',\n              fontWeight: 600,\n              color: '#262622',\n              cursor: 'pointer',\n              boxShadow: '0 1px 2px rgba(0,0,0,0.05)',\n              transition: 'all 120ms'\n            }}",
        "className=\"flex items-center gap-1.5 bg-white border border-[#dadad3] rounded-2xl py-2.5 px-4 text-xs font-semibold text-[#262622] cursor-pointer shadow-sm transition-all duration-120\""
    ),
    (
        "style={{\n          background: '#ffffff',\n          borderRadius: '16px',\n          border: '1px solid #dadad3',\n          boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.05)',\n          overflow: 'hidden'\n        }}",
        "className=\"bg-white rounded-2xl border border-[#dadad3] shadow-sm overflow-hidden\""
    ),
    (
        "style={{ padding: '20px 24px', borderBottom: '1px solid #dadad3', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}",
        "className=\"py-5 px-6 border-b border-[#dadad3] flex justify-between items-center\""
    ),
    (
        "style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px', textAlign: 'left' }}",
        "className=\"w-full border-collapse text-[13px] text-left\""
    ),
    (
        "style={{ background: '#f6f6f3', color: '#262622', fontWeight: 600, borderBottom: '1px solid #dadad3' }}",
        "className=\"bg-[#f6f6f3] text-[#262622] font-semibold border-b border-[#dadad3]\""
    ),
    (
        "style={{ padding: '12px 24px' }}",
        "className=\"py-3 px-6\""
    ),
    (
        "style={{ padding: '12px 16px' }}",
        "className=\"py-3 px-4\""
    ),
    (
        "style={{ padding: '12px 24px', textAlign: 'right' }}",
        "className=\"py-3 px-6 text-right\""
    ),
    (
        "style={{ borderBottom: '1px solid #f6f6f3', color: '#262622' }}",
        "className=\"border-b border-[#f6f6f3] text-[#262622]\""
    ),
    (
        "style={{ padding: '14px 24px', fontWeight: 700, color: '#000000' }}",
        "className=\"py-3.5 px-6 font-bold text-black\""
    ),
    (
        "style={{ padding: '14px 16px' }}",
        "className=\"py-3.5 px-4\""
    ),
    (
        "style={{ padding: '14px 16px', color: row.aqi > 100 ? '#ef4444' : '#7B8F65', fontWeight: 700 }}",
        "className=\"py-3.5 px-4 font-bold\" style={{ color: row.aqi > 100 ? '#ef4444' : '#7B8F65' }}"
    ),
    (
        "style={{\n                            fontSize: '10px',\n                            padding: '2px 6px',\n                            borderRadius: '4px',\n                            background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)',\n                            color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65',\n                            fontWeight: 700\n                          }}",
        "className=\"text-[10px] py-0.5 px-1.5 rounded font-bold\" style={{ background: row.aqi > 150 ? 'rgba(239,68,68,0.08)' : row.aqi > 100 ? 'rgba(249,115,22,0.08)' : 'rgba(123,143,101,0.08)', color: row.aqi > 150 ? '#ef4444' : row.aqi > 100 ? '#f97316' : '#7B8F65' }}"
    ),
    (
        "style={{ padding: '14px 24px', textAlign: 'right', fontWeight: 500 }}",
        "className=\"py-3.5 px-6 text-right font-medium\""
    ),
    # Modal styles
    (
        "style={{\n          position: 'fixed',\n          inset: 0,\n          background: 'rgba(15, 23, 42, 0.6)',\n          backdropFilter: 'blur(8px)',\n          display: 'flex',\n          alignItems: 'center',\n          justifyContent: 'center',\n          zIndex: 9999,\n          padding: '24px',\n          animation: 'fadeIn 200ms ease-out'\n        }}",
        "className=\"fixed inset-0 bg-[rgba(15,23,42,0.6)] backdrop-blur-sm flex items-center justify-center z-[9999] p-6 animate-fade-in\""
    ),
    (
        "style={{\n            background: '#ffffff',\n            borderRadius: '20px',\n            width: '100%',\n            maxWidth: '840px',\n            boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',\n            border: '1px solid #dadad3',\n            overflow: 'hidden',\n            display: 'flex',\n            flexDirection: 'column',\n            maxHeight: '90vh',\n            animation: 'scaleUp 250ms cubic-bezier(0.16, 1, 0.3, 1)'\n          }}",
        "className=\"bg-white rounded-[20px] w-full max-w-[840px] shadow-2xl border border-[#dadad3] overflow-hidden flex flex-col max-h-[90vh] animate-scale-up\""
    ),
    (
        "style={{\n              background: '#000000',\n              color: '#ffffff',\n              padding: '20px 28px',\n              display: 'flex',\n              justifyContent: 'space-between',\n              alignItems: 'center'\n            }}",
        "className=\"bg-black text-white py-5 px-7 flex justify-between items-center\""
    ),
    (
        "style={{ fontSize: '11px', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}",
        "className=\"text-[11px] font-bold text-slate-400 uppercase tracking-wider\""
    ),
    (
        "style={{ fontSize: '22px', fontWeight: 800, margin: '2px 0 0', fontFamily: FONT_DISPLAY }}",
        "className=\"text-[22px] font-extrabold mt-0.5 mb-0 font-display\""
    ),
    (
        "style={{\n                  background: 'rgba(255,255,255,0.1)',\n                  border: 'none',\n                  color: '#ffffff',\n                  width: '36px',\n                  height: '36px',\n                  borderRadius: '50%',\n                  display: 'flex',\n                  alignItems: 'center',\n                  justifyContent: 'center',\n                  cursor: 'pointer',\n                  transition: 'background 150ms'\n                }}",
        "className=\"bg-white/10 border-none text-white w-9 h-9 rounded-full flex items-center justify-center cursor-pointer transition-colors duration-150\""
    ),
    (
        "style={{ padding: '28px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '24px' }}",
        "className=\"p-7 overflow-y-auto flex flex-col gap-6\""
    ),
    (
        "style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px', background: '#f6f6f3', padding: '16px', borderRadius: '16px', border: '1px solid #dadad3' }}",
        "className=\"grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-4 bg-[#f6f6f3] p-4 rounded-2xl border border-[#dadad3]\""
    ),
    (
        "style={{ fontSize: '11px', color: '#262622', fontWeight: 600, textTransform: 'uppercase' }}",
        "className=\"text-[11px] text-[#262622] font-semibold uppercase\""
    ),
    (
        "style={{ fontSize: '14px', fontWeight: 700, color: '#000000', marginTop: '2px' }}",
        "className=\"text-sm font-bold text-black mt-0.5\""
    ),
    (
        "style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#262622', marginTop: '1px' }}",
        "className=\"block text-xs font-medium text-[#262622] mt-0.5\""
    ),
    (
        "style={{ fontSize: '11px', color: '#262622', fontWeight: 500 }}",
        "className=\"text-[11px] text-[#262622] font-medium\""
    ),
    (
        "style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}",
        "className=\"flex items-center gap-1.5 mt-1\""
    ),
    (
        "style={{\n                      background: selectedIncident?.priority === 'urgent' ? '#fee2e2' : selectedIncident?.priority === 'high' ? '#ffedd5' : '#fef3c7',\n                      color: selectedIncident?.priority === 'urgent' ? '#b91c1c' : selectedIncident?.priority === 'high' ? '#c2410c' : '#d97706',\n                      fontSize: '11px',\n                      fontWeight: 700,\n                      padding: '2px 8px',\n                      borderRadius: '16px',\n                      textTransform: 'uppercase'\n                    }}",
        "className=\"text-[11px] font-bold py-0.5 px-2 rounded-full uppercase\" style={{ background: selectedIncident?.priority === 'urgent' ? '#fee2e2' : selectedIncident?.priority === 'high' ? '#ffedd5' : '#fef3c7', color: selectedIncident?.priority === 'urgent' ? '#b91c1c' : selectedIncident?.priority === 'high' ? '#c2410c' : '#d97706' }}"
    ),
    (
        "style={{ fontSize: '13px', fontWeight: 700, color: '#000000' }}",
        "className=\"text-[13px] font-bold text-black\""
    ),
    (
        "style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '28px', flexWrap: 'wrap' }}",
        "className=\"grid grid-cols-[1.5fr_1fr] gap-7 flex-wrap\""
    ),
    (
        "style={{ fontSize: '14px', fontWeight: 700, color: '#262622', borderBottom: '2px solid #dadad3', paddingBottom: '6px', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}",
        "className=\"text-sm font-bold text-[#262622] border-b-2 border-[#dadad3] pb-1.5 mb-2.5 uppercase tracking-[0.5px]\""
    ),
    (
        "style={{ fontSize: '14px', color: '#262622', lineHeight: '1.6', background: '#f6f6f3', padding: '16px', borderRadius: '16px', border: '1.5px solid #dadad3', margin: 0 }}",
        "className=\"text-sm text-[#262622] leading-relaxed bg-[#f6f6f3] p-4 rounded-2xl border-1.5 border-[#dadad3] m-0\""
    ),
    (
        "style={{ fontSize: '14px', color: '#262622', lineHeight: '1.6', fontStyle: 'italic', background: '#fcfaff', padding: '16px', borderRadius: '16px', border: '1.5px solid #e8dbff', margin: 0 }}",
        "className=\"text-sm text-[#262622] leading-relaxed italic bg-[#fcfaff] p-4 rounded-2xl border-1.5 border-[#e8dbff] m-0\""
    ),
    (
        "style={{\n                      fontSize: '12px',\n                      color: '#262622',\n                      padding: '12px',\n                      background: '#f6f6f3',\n                      borderRadius: '16px',\n                      border: '1.5px dashed #dadad3',\n                      textAlign: 'center'\n                    }}",
        "className=\"text-xs text-[#262622] p-3 bg-[#f6f6f3] rounded-2xl border-1.5 border-dashed border-[#dadad3] text-center\""
    ),
    (
        "style={{\n                               background: isSuspect ? '#fffafb' : '#f0f9ff',\n                               border: isSuspect ? '1.5px solid #ffe4e6' : '1.5px solid #e0f2fe',\n                               padding: '12px',\n                               borderRadius: '16px',\n                               display: 'flex',\n                               flexDirection: 'column',\n                               gap: '4px'\n                             }}",
        "className=\"bg-[#fffafb] border-1.5 border-[#ffe4e6] p-3 rounded-2xl flex flex-col gap-1\" style={{ background: isSuspect ? '#fffafb' : '#f0f9ff', borderColor: isSuspect ? '#ffe4e6' : '#e0f2fe' }}"
    ),
    (
        "style={{ fontSize: '13px', fontWeight: 700, color: isSuspect ? '#be123c' : '#0369a1' }}",
        "className=\"text-[13px] font-bold\" style={{ color: isSuspect ? '#be123c' : '#0369a1' }}"
    ),
    (
        "style={{\n                                   fontSize: '10px',\n                                   fontWeight: 700,\n                                   background: isSuspect ? '#ffe4e6' : '#e0f2fe',\n                                   color: isSuspect ? '#be123c' : '#0369a1',\n                                   padding: '1px 6px',\n                                   borderRadius: '16px',\n                                   textTransform: 'uppercase'\n                                 }}",
        "className=\"text-[10px] font-bold py-0.5 px-1.5 rounded-full uppercase\" style={{ background: isSuspect ? '#ffe4e6' : '#e0f2fe', color: isSuspect ? '#be123c' : '#0369a1' }}"
    ),
    (
        "style={{ fontSize: '11px', color: '#262622' }}",
        "className=\"text-[11px] text-[#262622]\""
    ),
    (
        "style={{ fontSize: '11px', color: '#262622', fontStyle: 'italic' }}",
        "className=\"text-[11px] text-[#262622] italic\""
    ),
    (
        "style={{\n                      background: '#f6f6f3',\n                      border: '1.5px solid #dadad3',\n                      padding: '12px',\n                      borderRadius: '16px',\n                      display: 'flex',\n                      flexDirection: 'column',\n                      gap: '8px',\n                      fontSize: '12px'\n                    }}",
        "className=\"bg-[#f6f6f3] border-1.5 border-[#dadad3] p-3 rounded-2xl flex flex-col gap-2 text-xs\""
    ),
    (
        "style={{ display: 'flex', justifyContent: 'space-between' }}",
        "className=\"flex justify-between\""
    ),
    (
        "style={{ color: '#262622', fontWeight: 600 }}",
        "className=\"text-[#262622] font-semibold\""
    ),
    (
        "style={{ fontWeight: 700, color: '#000000', textTransform: 'capitalize' }}",
        "className=\"font-bold text-black capitalize\""
    ),
    (
        "style={{\n              background: '#f6f6f3',\n              borderTop: '1px solid #dadad3',\n              padding: '16px 28px',\n              display: 'flex',\n              justifyContent: 'flex-end',\n              gap: '12px'\n            }}",
        "className=\"bg-[#f6f6f3] border-t border-[#dadad3] py-4 px-7 flex justify-end gap-3\""
    ),
    (
        "style={{\n                  height: '38px',\n                  padding: '0 20px',\n                  background: '#000000',\n                  color: '#ffffff',\n                  border: 'none',\n                  borderRadius: '6px',\n                  fontSize: '13px',\n                  fontWeight: 700,\n                  cursor: 'pointer',\n                  transition: 'background 120ms'\n                }}",
        "className=\"h-[38px] px-5 bg-black text-white border-none rounded font-bold text-[13px] cursor-pointer transition-colors duration-120 hover:bg-neutral-800\""
    ),
    (
        "style={{ padding: '40px 24px', background: '#f6f6f3', minHeight: '100vh', textAlign: 'center', color: '#262622', fontWeight: 600 }}",
        "className=\"py-10 px-6 bg-[#f6f6f3] min-h-screen text-center text-[#262622] font-semibold\""
    )
]

for target, replacement in replacements:
    content = content.replace(target, replacement)

# Save back the file
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Tailwind replacement script completed successfully.")
