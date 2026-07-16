<script setup lang="ts">
import { CalendarRoot } from 'reka-ui'
import { ChevronDown, ChevronUp } from '@lucide/vue'
import { Button } from '@/shared/ui/button'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/shared/ui/collapsible'
import {
  CalendarCell,
  CalendarCellTrigger,
  CalendarGrid,
  CalendarGridBody,
  CalendarGridHead,
  CalendarGridRow,
  CalendarHeadCell,
  CalendarHeader,
  CalendarHeading,
  CalendarNextButton,
  CalendarPrevButton,
} from '@/shared/ui/calendar'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/shared/ui/tooltip'
import { useDailyDesk } from './useDailyDesk'

const {
  isExpanded,
  handleExpandedChange,
  selectedDate,
  selectDate,
  hasNote,
  setHoveredDate,
  previewTaskCount,
  previewExcerpt,
  isPreviewLoading,
} = useDailyDesk()
</script>

<template>
  <section aria-label="Daily Desk" class="shrink-0 border-t">
    <Collapsible :open="isExpanded" @update:open="handleExpandedChange">
      <div class="flex items-center justify-between px-2 py-1.5">
        <span class="text-xs font-medium text-muted-foreground">Daily Desk</span>
        <CollapsibleTrigger as-child>
          <Button
            variant="ghost"
            size="icon"
            class="size-6"
            aria-label="Recolher ou estender o Daily Desk"
          >
            <ChevronUp v-if="isExpanded" class="size-4" />
            <ChevronDown v-else class="size-4" />
          </Button>
        </CollapsibleTrigger>
      </div>

      <CollapsibleContent>
        <TooltipProvider :delay-duration="200">
          <CalendarRoot
            v-slot="{ grid, weekDays }"
            :model-value="selectedDate"
            :prevent-deselect="true"
            locale="pt-BR"
            class="p-2 pt-0"
            @update:model-value="(value) => value && selectDate(value)"
          >
            <CalendarHeader>
              <nav class="absolute inset-x-0 top-0 flex items-center justify-between">
                <CalendarPrevButton />
                <CalendarNextButton />
              </nav>
              <CalendarHeading />
            </CalendarHeader>

            <CalendarGrid v-for="month in grid" :key="month.value.toString()">
              <CalendarGridHead>
                <CalendarGridRow>
                  <CalendarHeadCell v-for="day in weekDays" :key="day">{{
                    day
                  }}</CalendarHeadCell>
                </CalendarGridRow>
              </CalendarGridHead>
              <CalendarGridBody>
                <CalendarGridRow
                  v-for="(weekDates, rowIndex) in month.rows"
                  :key="`week-${rowIndex}`"
                >
                  <CalendarCell
                    v-for="weekDate in weekDates"
                    :key="weekDate.toString()"
                    :date="weekDate"
                  >
                    <Tooltip>
                      <TooltipTrigger as-child>
                        <CalendarCellTrigger
                          :day="weekDate"
                          :month="month.value"
                          @focus="setHoveredDate(weekDate)"
                          @mouseenter="setHoveredDate(weekDate)"
                          @blur="setHoveredDate(null)"
                          @mouseleave="setHoveredDate(null)"
                        >
                          <template #default="{ dayValue }">
                            <span class="relative flex flex-col items-center">
                              {{ dayValue }}
                              <span
                                v-if="hasNote(weekDate)"
                                class="absolute -bottom-1 size-1 rounded-full bg-primary"
                              />
                            </span>
                          </template>
                        </CalendarCellTrigger>
                      </TooltipTrigger>
                      <TooltipContent v-if="hasNote(weekDate)">
                        <p v-if="isPreviewLoading">Carregando…</p>
                        <template v-else>
                          <p>{{ previewExcerpt || 'Nota vazia' }}</p>
                          <p v-if="previewTaskCount > 0" class="text-muted-foreground">
                            {{ previewTaskCount }} tarefa(s) pendente(s)
                          </p>
                        </template>
                      </TooltipContent>
                    </Tooltip>
                  </CalendarCell>
                </CalendarGridRow>
              </CalendarGridBody>
            </CalendarGrid>
          </CalendarRoot>
        </TooltipProvider>
      </CollapsibleContent>
    </Collapsible>
  </section>
</template>
