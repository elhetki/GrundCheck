'use client';

import { useEffect, useRef } from 'react';
import * as d3 from 'd3';
import type { GraphData, GraphNode, GraphLink } from '@/lib/types';

const NODE_COLORS: Record<string, string> = {
  company: '#6C63FF',
  property: '#22D3EE',
  person: '#34D399',
  insolvency: '#F87171',
};

const NODE_RADIUS = 24;

interface OwnershipGraphProps {
  data: GraphData;
}

export function OwnershipGraph({ data }: OwnershipGraphProps) {
  const svgRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (!svgRef.current || data.nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 800;
    const height = svgRef.current.clientHeight || 600;

    // Arrow marker for directed edges
    svg.append('defs').append('marker')
      .attr('id', 'arrowhead')
      .attr('viewBox', '0 -5 10 10')
      .attr('refX', NODE_RADIUS + 10)
      .attr('refY', 0)
      .attr('markerWidth', 8)
      .attr('markerHeight', 8)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,-5L10,0L0,5')
      .attr('fill', '#2A2A3A');

    const container = svg.append('g');

    // Zoom + pan
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 4])
      .on('zoom', (event: d3.D3ZoomEvent<SVGSVGElement, unknown>) => {
        container.attr('transform', String(event.transform));
      });
    svg.call(zoom);

    // Clone nodes to avoid mutating props
    const nodes: (GraphNode & d3.SimulationNodeDatum)[] = data.nodes.map((n) => ({ ...n }));
    const nodeById = new Map(nodes.map((n) => [n.id, n]));

    // Map links to node objects for D3
    const links: d3.SimulationLinkDatum<GraphNode & d3.SimulationNodeDatum>[] = data.links
      .map((l: GraphLink) => ({
        source: nodeById.get(l.source) ?? l.source,
        target: nodeById.get(l.target) ?? l.target,
        label: l.label,
        weight: l.weight,
      }));

    // Force simulation
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id((d) => (d as GraphNode).id).distance(140))
      .force('charge', d3.forceManyBody().strength(-400))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collision', d3.forceCollide(NODE_RADIUS + 10));

    // Links
    const link = container.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('stroke', '#2A2A3A')
      .attr('stroke-width', 1.5)
      .attr('marker-end', 'url(#arrowhead)');

    // Link labels
    const linkLabel = container.append('g')
      .selectAll('text')
      .data(links)
      .join('text')
      .attr('fill', '#8B89A0')
      .attr('font-size', 10)
      .attr('text-anchor', 'middle')
      .text((d) => {
        const l = d as { label: string; weight?: number };
        return l.weight != null ? `${l.label} (${l.weight}%)` : l.label;
      });

    // Node groups (circle + label)
    const node = container.append('g')
      .selectAll('g')
      .data(nodes)
      .join('g')
      .attr('cursor', 'pointer')
      .call(
        d3.drag<SVGGElement, GraphNode & d3.SimulationNodeDatum>()
          .on('start', (event, d) => {
            if (!event.active) simulation.alphaTarget(0.3).restart();
            d.fx = d.x;
            d.fy = d.y;
          })
          .on('drag', (event, d) => {
            d.fx = event.x;
            d.fy = event.y;
          })
          .on('end', (event, d) => {
            if (!event.active) simulation.alphaTarget(0);
            d.fx = null;
            d.fy = null;
          }) as unknown as (selection: d3.Selection<SVGGElement, GraphNode & d3.SimulationNodeDatum, SVGGElement, unknown>) => void
      )
      .on('click', (_event, d) => {
        if (d.type !== 'insolvency') {
          window.location.href = `/entity/${d.id}`;
        }
      });

    node.append('circle')
      .attr('r', NODE_RADIUS)
      .attr('fill', (d) => NODE_COLORS[d.type] ?? '#6C63FF')
      .attr('fill-opacity', (d) => d.id === data.rootId ? 1 : 0.7)
      .attr('stroke', (d) => d.id === data.rootId ? '#fff' : 'transparent')
      .attr('stroke-width', 2);

    node.append('text')
      .attr('dy', NODE_RADIUS + 14)
      .attr('text-anchor', 'middle')
      .attr('fill', '#E8E6F0')
      .attr('font-size', 11)
      .attr('font-weight', (d) => d.id === data.rootId ? 600 : 400)
      .text((d) => d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name);

    // Tick handler
    simulation.on('tick', () => {
      link
        .attr('x1', (d) => (d.source as GraphNode).x ?? 0)
        .attr('y1', (d) => (d.source as GraphNode).y ?? 0)
        .attr('x2', (d) => (d.target as GraphNode).x ?? 0)
        .attr('y2', (d) => (d.target as GraphNode).y ?? 0);

      linkLabel
        .attr('x', (d) => (((d.source as GraphNode).x ?? 0) + ((d.target as GraphNode).x ?? 0)) / 2)
        .attr('y', (d) => (((d.source as GraphNode).y ?? 0) + ((d.target as GraphNode).y ?? 0)) / 2);

      node.attr('transform', (d) => `translate(${d.x ?? 0},${d.y ?? 0})`);
    });

    return () => {
      simulation.stop();
    };
  }, [data]);

  return (
    <svg
      ref={svgRef}
      className="w-full h-full"
      style={{ background: 'var(--bg)' }}
    />
  );
}

export default OwnershipGraph;
