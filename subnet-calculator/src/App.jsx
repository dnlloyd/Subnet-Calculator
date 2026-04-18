import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Calculator,
  Network,
  Hash,
  SlidersHorizontal,
  MonitorSmartphone,
  Info,
  Split,
  RotateCcw,
} from "lucide-react";

function ipToInt(ip) {
  const parts = ip.split(".").map(Number);
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n) || n < 0 || n > 255)) {
    return null;
  }

  return (
    (((parts[0] << 24) >>> 0) +
      ((parts[1] << 16) >>> 0) +
      ((parts[2] << 8) >>> 0) +
      (parts[3] >>> 0)) >>>
    0
  );
}

function intToIp(int) {
  return [
    (int >>> 24) & 255,
    (int >>> 16) & 255,
    (int >>> 8) & 255,
    int & 255,
  ].join(".");
}

function prefixToMaskInt(prefix) {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xffffffff >>> 0;
  return (0xffffffff << (32 - prefix)) >>> 0;
}

function prefixToMaskString(prefix) {
  return intToIp(prefixToMaskInt(prefix));
}

function getIpClass(firstOctet) {
  if (firstOctet >= 1 && firstOctet <= 126) return "Class A";
  if (firstOctet === 127) return "Loopback / Reserved";
  if (firstOctet >= 128 && firstOctet <= 191) return "Class B";
  if (firstOctet >= 192 && firstOctet <= 223) return "Class C";
  if (firstOctet >= 224 && firstOctet <= 239) return "Class D (Multicast)";
  if (firstOctet >= 240 && firstOctet <= 255) return "Class E (Experimental)";
  return "Unknown";
}

function getIpClassRange(ipClass) {
  switch (ipClass) {
    case "Class A":
      return "1.x.x.x-126.x.x.x";
    case "Class B":
      return "128.x.x.x-191.x.x.x";
    case "Class C":
      return "192.x.x.x-223.x.x.x";
    case "Class D (Multicast)":
      return "224.x.x.x-239.x.x.x";
    case "Class E (Experimental)":
      return "240.x.x.x-255.x.x.x";
    case "Loopback / Reserved":
      return "127.x.x.x";
    default:
      return "Based on first octet";
  }
}

function getClassColor(ipClass) {
  switch (ipClass) {
    case "Class A":
      return "text-blue-300";
    case "Class B":
      return "text-purple-300";
    case "Class C":
      return "text-emerald-300";
    case "Class D (Multicast)":
      return "text-yellow-300";
    case "Class E (Experimental)":
      return "text-red-300";
    case "Loopback / Reserved":
      return "text-orange-300";
    default:
      return "text-slate-100";
  }
}

function formatCount(n) {
  return new Intl.NumberFormat().format(n);
}

function calcSubnet(ip, prefix) {
  const ipInt = ipToInt(ip);
  if (ipInt === null) return null;

  const safePrefix = Math.max(1, Math.min(32, prefix));
  const maskInt = prefixToMaskInt(safePrefix);
  const wildcardInt = (~maskInt) >>> 0;
  const networkInt = (ipInt & maskInt) >>> 0;
  const broadcastInt = (networkInt | wildcardInt) >>> 0;
  const totalIps = 2 ** (32 - safePrefix);

  let usableHosts;
  let usableRange;

  if (safePrefix === 32) {
    usableHosts = 1;
    usableRange = intToIp(networkInt);
  } else if (safePrefix === 31) {
    usableHosts = 2;
    usableRange = `${intToIp(networkInt)} - ${intToIp(broadcastInt)}`;
  } else {
    usableHosts = Math.max(totalIps - 2, 0);
    usableRange = `${intToIp(networkInt + 1)} - ${intToIp(broadcastInt - 1)}`;
  }

  const firstOctet = Number(ip.split(".")[0]);
  const ipClass = getIpClass(firstOctet);

  return {
    ipClass,
    mask: intToIp(maskInt),
    wildcard: intToIp(wildcardInt),
    network: intToIp(networkInt),
    broadcast: intToIp(broadcastInt),
    cidr: `${intToIp(networkInt)}/${safePrefix}`,
    totalIps,
    usableHosts,
    usableRange,
  };
}

function splitSubnet(ip, prefix) {
  if (prefix >= 32) return [];
  const subnet = calcSubnet(ip, prefix);
  if (!subnet) return [];

  const baseInt = ipToInt(subnet.network);
  const childPrefix = prefix + 1;
  const childSize = 2 ** (32 - childPrefix);

  return [
    { ip: intToIp(baseInt), prefix: childPrefix },
    { ip: intToIp(baseInt + childSize), prefix: childPrefix },
  ];
}

const infoMap = {
  "IP Class": "Legacy address class determined by the first octet.",
  "Subnet Mask": "Defines which portion of the IP address represents the network versus host bits.",
  "Wildcard Mask": "Inverse of the subnet mask, often used in ACLs.",
  "Network Address": "The first address in the subnet, identifying the network itself.",
  "Broadcast Address": "The last address in the subnet, used to reach all hosts on the subnet.",
  "CIDR Block Notation": "Compact representation of the network using slash notation.",
  "Usable IP Range": "Range of IPs assignable to hosts within the subnet.",
  "Total IP Addresses": "Total number of IPs in the subnet, including network and broadcast where applicable.",
  "Usable Host Addresses": "Number of assignable IP addresses for hosts.",
};

function InfoTooltip({ label }) {
  return (
    <div className="group relative inline-block overflow-visible">
      <Info className="h-3.5 w-3.5 cursor-pointer text-slate-400 transition hover:text-slate-200" />
      <div className="pointer-events-none absolute bottom-full right-0 z-[9999] mb-2 w-60 rounded-lg border border-white/10 bg-slate-900 p-2 text-xs normal-case tracking-normal text-slate-300 opacity-0 shadow-2xl transition group-hover:opacity-100">
        {infoMap[label]}
      </div>
    </div>
  );
}

function StatCard({ label, value, hint }) {
  const isIpClass = label === "IP Class";
  const valueColor = isIpClass ? getClassColor(value) : "text-slate-100";
  const resolvedHint = isIpClass ? getIpClassRange(value) : hint;

  return (
    <div className="relative overflow-visible rounded-2xl border border-white/10 bg-white/5 p-3.5 shadow-xl shadow-black/20 backdrop-blur-sm">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
        <span>{label}</span>
        <InfoTooltip label={label} />
      </div>
      <div className={`mt-1.5 break-all text-base font-semibold lg:text-lg ${valueColor}`}>{value}</div>
      {resolvedHint ? <div className="mt-1.5 text-xs text-slate-400 lg:text-sm">{resolvedHint}</div> : null}
    </div>
  );
}

function HighlightCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-cyan-400/20 bg-cyan-400/5 p-4 shadow-lg shadow-cyan-950/10">
      <div className="flex items-center justify-between text-xs uppercase tracking-[0.18em] text-slate-400">
        <span>{label}</span>
        <InfoTooltip label={label} />
      </div>
      <div className="mt-1.5 break-all text-lg font-semibold text-white lg:text-xl">{value}</div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="rounded-xl border border-cyan-400/20 bg-cyan-400/10 p-1.5 text-cyan-300">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-white lg:text-xl">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-400 lg:text-sm">{subtitle}</p>
      </div>
    </div>
  );
}

function runSubnetSelfTests() {
  const tests = [
    {
      name: "Class C /24",
      input: ["192.168.1.42", 24],
      expected: {
        ipClass: "Class C",
        network: "192.168.1.0",
        broadcast: "192.168.1.255",
        mask: "255.255.255.0",
        cidr: "192.168.1.0/24",
        totalIps: 256,
        usableHosts: 254,
      },
    },
    {
      name: "Class A /8",
      input: ["10.5.6.7", 8],
      expected: {
        ipClass: "Class A",
        network: "10.0.0.0",
        broadcast: "10.255.255.255",
        mask: "255.0.0.0",
        cidr: "10.0.0.0/8",
      },
    },
    {
      name: "Point-to-point /31",
      input: ["172.16.10.9", 31],
      expected: {
        network: "172.16.10.8",
        broadcast: "172.16.10.9",
        usableHosts: 2,
        usableRange: "172.16.10.8 - 172.16.10.9",
      },
    },
    {
      name: "Single host /32",
      input: ["8.8.8.8", 32],
      expected: {
        network: "8.8.8.8",
        broadcast: "8.8.8.8",
        usableHosts: 1,
        usableRange: "8.8.8.8",
      },
    },
    {
      name: "Class detection for Class B",
      input: ["172.16.5.10", 16],
      expected: {
        ipClass: "Class B",
        network: "172.16.0.0",
        broadcast: "172.16.255.255",
      },
    },
  ];

  tests.forEach(({ name, input, expected }) => {
    const result = calcSubnet(input[0], input[1]);
    Object.entries(expected).forEach(([key, value]) => {
      console.assert(
        result?.[key] === value,
        `${name} failed for ${key}. Expected ${value}, received ${result?.[key]}`,
      );
    });
  });

  const splitResult = splitSubnet("192.168.0.0", 16);
  console.assert(splitResult.length === 2, "Split test failed: expected two child subnets.");
  console.assert(splitResult[0].ip === "192.168.0.0" && splitResult[0].prefix === 17, "Split test failed: incorrect first child.");
  console.assert(splitResult[1].ip === "192.168.128.0" && splitResult[1].prefix === 17, "Split test failed: incorrect second child.");
  console.assert(ipToInt("999.1.1.1") === null, "Invalid IP test failed.");
}

function createBreakdownNode(ip, prefix, depth = 0) {
  return {
    id: `${ip}/${prefix}-${depth}-${Math.random().toString(36).slice(2, 8)}`,
    ip,
    prefix,
    depth,
    children: [],
    isExpanded: false,
  };
}

function BreakdownNodeRow({ node, onDivide, onReset }) {
  const calc = calcSubnet(node.ip, node.prefix);
  if (!calc) return null;

  const canDivide = node.prefix < 32 && node.children.length === 0;

  return (
    <>
      <div
        className={`grid items-center gap-0 overflow-hidden rounded-xl border bg-white/5 ${
          node.depth > 0
            ? "border-cyan-400/20 bg-slate-900/60"
            : "border-white/10"
        }`}
        style={{
          gridTemplateColumns: "1.35fr 2.5fr 2.45fr 0.75fr 0.9fr",
          marginLeft: `${node.depth * 16}px`,
        }}
      >
        <div className="border-r border-white/10 px-3 py-3 text-sm font-semibold text-white">
          <div className="flex items-center gap-2">
            {node.depth > 0 && (
              <span className="h-4 w-1 rounded bg-cyan-400/50" />
            )}
            <span>{calc.cidr}</span>
          </div>
        </div>

        <div className="border-r border-white/10 px-3 py-3 text-sm text-slate-300">
          {calc.network} - {calc.broadcast}
        </div>

        <div className="border-r border-white/10 px-3 py-3 text-sm text-slate-300">
          {calc.usableRange}
        </div>

        <div className="border-r border-white/10 px-3 py-3 text-sm font-semibold text-white">
          {formatCount(calc.usableHosts)}
        </div>

        <div className="flex items-center gap-2 px-3 py-2.5">
          {canDivide ? (
            <button
              type="button"
              onClick={() => onDivide(node.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-cyan-400/30 bg-cyan-400/10 px-2.5 py-1.5 text-xs font-medium text-cyan-300 transition hover:bg-cyan-400/15"
            >
              <Split className="h-3.5 w-3.5" />
              Divide
            </button>
          ) : node.children.length > 0 ? (
            <button
              type="button"
              onClick={() => onReset(node.id)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-white/10"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset
            </button>
          ) : (
            <span className="text-xs text-slate-500">/32 max</span>
          )}
        </div>
      </div>

      {node.children.length > 0 ? (
        <div className="mt-2 space-y-2">
          {node.children.map((child) => (
            <BreakdownNodeRow key={child.id} node={child} onDivide={onDivide} onReset={onReset} />
          ))}
        </div>
      ) : null}
    </>
  );
}

function updateNodeTree(nodes, nodeId, updater) {
  return nodes.map((node) => {
    if (node.id === nodeId) {
      return updater(node);
    }

    if (node.children.length > 0) {
      return {
        ...node,
        children: updateNodeTree(node.children, nodeId, updater),
      };
    }

    return node;
  });
}

function SubnetDivider({ baseCidr }) {
  const [rootNodes, setRootNodes] = useState([]);

  useEffect(() => {
    const [ip, prefixStr] = baseCidr.split("/");
    const prefix = Number(prefixStr);
    setRootNodes([createBreakdownNode(ip, prefix, 0)]);
  }, [baseCidr]);

  const divideNode = (nodeId) => {
    setRootNodes((prev) =>
      updateNodeTree(prev, nodeId, (node) => {
        const children = splitSubnet(node.ip, node.prefix).map((child) =>
          createBreakdownNode(child.ip, child.prefix, node.depth + 1),
        );

        return {
          ...node,
          isExpanded: true,
          children,
        };
      }),
    );
  };

  const resetNode = (nodeId) => {
    setRootNodes((prev) =>
      updateNodeTree(prev, nodeId, (node) => ({
        ...node,
        isExpanded: false,
        children: [],
      })),
    );
  };

  return (
    <div className="mt-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
        <div>Click <span className="text-cyan-300">Divide</span> on any subnet to split it into two child networks.</div>
        <div>Starting network: <span className="font-medium text-slate-200">{baseCidr}</span></div>
      </div>

      <div
        className="grid gap-0 overflow-hidden rounded-xl border border-white/10 bg-slate-900/60 text-xs font-semibold uppercase tracking-[0.16em] text-slate-300"
        style={{ gridTemplateColumns: "1.35fr 2.5fr 2.45fr 0.75fr 0.9fr" }}
      >
        <div className="border-r border-white/10 px-3 py-2.5">Subnet</div>
        <div className="border-r border-white/10 px-3 py-2.5">Range of Addresses</div>
        <div className="border-r border-white/10 px-3 py-2.5">Usable IPs</div>
        <div className="border-r border-white/10 px-3 py-2.5">Hosts</div>
        <div className="px-3 py-2.5">Action</div>
      </div>

      <div className="mt-2 space-y-2">
        {rootNodes.map((node) => (
          <BreakdownNodeRow key={node.id} node={node} onDivide={divideNode} onReset={resetNode} />
        ))}
      </div>
    </div>
  );
}

export default function SubnetCalculatorApp() {
  const [ip, setIp] = useState("192.168.1.42");
  const [prefix, setPrefix] = useState(24);
  const [prefixInput, setPrefixInput] = useState("24");

  useEffect(() => {
    runSubnetSelfTests();
  }, []);

  const ipIsValid = ipToInt(ip) !== null;

  const subnet = useMemo(() => {
    if (!ipIsValid) return null;
    return calcSubnet(ip, prefix);
  }, [ip, prefix, ipIsValid]);

  const handleSliderChange = (value) => {
    const next = Number(value);
    setPrefix(next);
    setPrefixInput(String(next));
  };

  const handlePrefixInputChange = (value) => {
    setPrefixInput(value);
    const parsed = Number(value);
    if (Number.isInteger(parsed) && parsed >= 1 && parsed <= 32) {
      setPrefix(parsed);
    }
  };

  return (
    <div className="min-h-screen bg-[#07111f] text-slate-200">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.14),transparent_30%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.08),transparent_25%)]" />

      <div className="relative mx-auto max-w-5xl px-4 py-6 lg:px-6 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
          className="rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/20 backdrop-blur-xl lg:p-6"
        >
          <div className="space-y-6">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1 text-xs font-medium uppercase tracking-[0.2em] text-cyan-300">
                <MonitorSmartphone className="h-3.5 w-3.5" />
                daniel-lloyd.net
              </div>

              <h1 className="mt-3 text-3xl font-bold tracking-tight text-white lg:text-4xl">
                Subnet Calculator
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300 lg:text-base">
                Use this tool to calculate subnet boundaries, address ranges, and host capacity based on an IP address and subnet mask.
              </p>
            </div>

            <div className="rounded-3xl border border-white/10 bg-black/20 p-4 shadow-inner shadow-black/30 lg:p-5">
              <SectionTitle
                icon={Calculator}
                title="Calculator Inputs"
                subtitle="Enter an IPv4 address, then choose the subnet mask with either control below."
              />

              <div className="mt-5 space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">IPv4 Address</label>
                  <input
                    value={ip}
                    onChange={(e) => setIp(e.target.value)}
                    placeholder="e.g. 192.168.1.42"
                    className="w-full rounded-2xl border border-white/10 bg-slate-900/90 px-4 py-2.5 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 lg:text-base"
                  />
                  <div className="mt-1.5 text-xs text-slate-400 lg:text-sm">
                    {ipIsValid ? (
                      <span className="text-emerald-300">Detected: {subnet?.ipClass}</span>
                    ) : (
                      <span className="text-rose-300">Enter a valid IPv4 address to calculate subnet details.</span>
                    )}
                  </div>
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="text-sm font-medium text-slate-300">Subnet Mask Slider</label>
                    <div className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                      Mask: {prefixToMaskString(prefix)}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-white/10 bg-slate-900/60 px-4 py-4">
                    <div className="mb-3 flex items-center gap-2 text-sm text-slate-400">
                      <SlidersHorizontal className="h-4 w-4" />
                      Bit {prefix} of 32
                    </div>
                    <input
                      type="range"
                      min="1"
                      max="32"
                      value={prefix}
                      onChange={(e) => handleSliderChange(e.target.value)}
                      className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-slate-700 accent-cyan-400"
                    />
                    <div className="mt-3 flex justify-between text-xs text-slate-500">
                      <span>/1 • 128.0.0.0</span>
                      <span>/32 • 255.255.255.255</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-300">Mask Bits (CIDR Prefix)</label>
                  <div className="relative">
                    <Hash className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                    <input
                      value={prefixInput}
                      onChange={(e) => handlePrefixInputChange(e.target.value)}
                      inputMode="numeric"
                      placeholder="Enter 1-32"
                      className="w-full rounded-2xl border border-white/10 bg-slate-900/90 py-2.5 pl-11 pr-4 text-sm text-white outline-none transition focus:border-cyan-400/60 focus:ring-2 focus:ring-cyan-400/20 lg:text-base"
                    />
                  </div>
                  <div className="mt-1.5 text-xs text-slate-400 lg:text-sm">Example: entering 27 sets the slider to /27 and updates every calculated field.</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.08 }}
          className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl lg:p-6"
        >
          <SectionTitle
            icon={Network}
            title="Network Details"
            subtitle="These values are recalculated from the current IP address and subnet mask."
          />

          {subnet ? (
            <>
              <div className="mt-5 grid gap-3 md:grid-cols-2">
                <HighlightCard label="Network Address" value={subnet.network} />
                <HighlightCard label="CIDR Block Notation" value={subnet.cidr} />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                <StatCard label="IP Class" value={subnet.ipClass} />
                <StatCard label="Subnet Mask" value={subnet.mask} hint={`/${prefix}`} />
                <StatCard label="Usable IP Range" value={subnet.usableRange} />
                <StatCard label="Total IP Addresses" value={formatCount(subnet.totalIps)} />
                <StatCard label="Usable Host Addresses" value={formatCount(subnet.usableHosts)} />
                <StatCard label="Wildcard Mask" value={subnet.wildcard} />
                <StatCard label="Broadcast Address" value={subnet.broadcast} />
              </div>
            </>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-white/10 bg-white/5 p-6 text-center text-sm text-slate-400">
              Enter a valid IPv4 address to display subnet calculations.
            </div>
          )}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.12 }}
          className="mt-6 rounded-3xl border border-white/10 bg-slate-950/70 p-5 shadow-2xl shadow-cyan-950/10 backdrop-blur-xl lg:p-6"
        >
          <SectionTitle
            icon={Network}
            title="Subnet Breakdown"
            subtitle="Click Divide on any subnet to split it into two child subnets."
          />

          {subnet ? <SubnetDivider baseCidr={subnet.cidr} /> : null}
        </motion.div>
      </div>
    </div>
  );
}
