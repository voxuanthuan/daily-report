#!/usr/bin/env node
const blessed = require('neo-blessed');

const screen = blessed.screen({
  smartCSR: true,
  title: 'Border Test'
});

const box = blessed.box({
  parent: screen,
  top: 'center',
  left: 'center',
  width: '50%',
  height: '50%',
  content: 'Testing rounded corners...',
  tags: true,
  border: {
    type: 'line'
  },
  style: {
    fg: 'white',
    bg: 'black',
    border: {
      fg: '#f0f0f0'
    }
  }
});

// Try setting border characters after creation
if (box.border) {
  box.border.type = 'line';
  box.border.ch = ['─', '│', '╭', '╮', '╰', '╯'];
}

screen.key(['escape', 'q', 'C-c'], function() {
  return process.exit(0);
});

box.focus();
screen.render();
