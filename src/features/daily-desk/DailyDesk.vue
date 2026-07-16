<script setup lang="ts">
import { CalendarRoot } from 'reka-ui'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/shared/ui/dialog'
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
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/shared/ui/tooltip'
import { useDailyDesk } from './useDailyDesk'

const {
  isOpen,
  handleOpenChange,
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
  <Dialog :open="isOpen" @update:open="handleOpenChange">
    <DialogContent class="w-auto max-w-sm">
      <DialogHeader>
        <DialogTitle>Daily Desk</DialogTitle>
        <DialogDescription>
          Escolha um dia para abrir a nota diária — dias com nota têm um indicador.
        </DialogDescription>
      </DialogHeader>

      <TooltipProvider :delay-duration="200">
        <CalendarRoot
          v-slot="{ grid, weekDays }"
          :model-value="selectedDate"
          :prevent-deselect="true"
          locale="pt-BR"
          class="p-2"
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
                <CalendarHeadCell v-for="day in weekDays" :key="day">{{ day }}</CalendarHeadCell>
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
    </DialogContent>
  </Dialog>
</template>
