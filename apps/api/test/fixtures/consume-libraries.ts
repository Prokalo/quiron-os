import * as core from '@quiron/core';
import * as ambassadors from '@quiron/ambassadors';
import * as tasksAgenda from '@quiron/tasks-agenda';
import * as marketingLeads from '@quiron/seguros-marketing-leads';
import * as eventEnvelope from '@quiron/event-envelope';

// Architecture fixture: exercise the real package, not a stand-in implementation.
export const loadedPackages = {
  '@quiron/core': core,
  '@quiron/ambassadors': ambassadors,
  '@quiron/tasks-agenda': tasksAgenda,
  '@quiron/seguros-marketing-leads': marketingLeads,
  '@quiron/event-envelope': eventEnvelope,
};
