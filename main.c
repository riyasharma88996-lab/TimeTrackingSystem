
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <time.h>

#define MAX_TASKS 100
#define NAME_LEN 100
#define FILE_NAME "tasks.txt"

typedef struct {
    int id;
    char name[NAME_LEN];
    char category[NAME_LEN];
    int completed;
    long totalSeconds;
} Task;

Task tasks[MAX_TASKS];
int taskCount = 0;
int nextId = 1;

int activeTaskId = -1;
time_t startTime = 0;

/* Function declarations */
void saveTasks(void);
void loadTasks(void);
void addTask(void);
void viewTasks(void);
void completeTask(void);
void startTimer(void);
void stopTimer(void);
void showSummary(void);
int findTask(int id);
void clearInputBuffer(void);

/* Clear remaining input characters */
void clearInputBuffer(void) {
    int ch;
    while ((ch = getchar()) != '\n' && ch != EOF) {
    }
}

/* Save tasks to a file */
void saveTasks(void) {
    FILE *fp = fopen(FILE_NAME, "w");

    if (fp == NULL) {
        printf("\nError: Could not save tasks.\n");
        return;
    }

    fprintf(fp, "%d\n", nextId);

    for (int i = 0; i < taskCount; i++) {
        fprintf(fp, "%d|%s|%s|%d|%ld\n",
                tasks[i].id,
                tasks[i].name,
                tasks[i].category,
                tasks[i].completed,
                tasks[i].totalSeconds);
    }

    fclose(fp);
}

/* Load saved tasks */
void loadTasks(void) {
    FILE *fp = fopen(FILE_NAME, "r");

    if (fp == NULL) {
        return;
    }

    if (fscanf(fp, "%d", &nextId) != 1) {
        fclose(fp);
        return;
    }

    /* Remove newline after nextId */
    int ch;
    while ((ch = fgetc(fp)) != '\n' && ch != EOF) {
    }

    while (taskCount < MAX_TASKS) {
        Task t;

        if (fscanf(fp, "%d|%99[^|]|%99[^|]|%d|%ld",
                   &t.id,
                   t.name,
                   t.category,
                   &t.completed,
                   &t.totalSeconds) != 5) {
            break;
        }

        tasks[taskCount++] = t;

        /* Move past the newline */
        while ((ch = fgetc(fp)) != '\n' && ch != EOF) {
        }
    }

    fclose(fp);
}

/* Add a new task */
void addTask(void) {
    if (taskCount >= MAX_TASKS) {
        printf("\nTask limit reached.\n");
        return;
    }

    Task *t = &tasks[taskCount];

    printf("\nEnter task name: ");

    if (scanf(" %99[^\n]", t->name) != 1) {
        printf("Invalid task name.\n");
        clearInputBuffer();
        return;
    }
    clearInputBuffer();

    printf("Enter category: ");

    if (scanf(" %99[^\n]", t->category) != 1) {
        printf("Invalid category.\n");
        clearInputBuffer();
        return;
    }
    clearInputBuffer();

    /* Avoid breaking the file format */
    for (int i = 0; t->name[i] != '\0'; i++) {
        if (t->name[i] == '|')
            t->name[i] = '-';
    }

    for (int i = 0; t->category[i] != '\0'; i++) {
        if (t->category[i] == '|')
            t->category[i] = '-';
    }

    t->id = nextId++;
    t->completed = 0;
    t->totalSeconds = 0;

    taskCount++;
    saveTasks();

    printf("\nTask added successfully! ID: %d\n", t->id);
}

/* Find a task using its ID */
int findTask(int id) {
    for (int i = 0; i < taskCount; i++) {
        if (tasks[i].id == id) {
            return i;
        }
    }

    return -1;
}

/* Display all tasks */
void viewTasks(void) {
    if (taskCount == 0) {
        printf("\nNo tasks available. Add a task first.\n");
        return;
    }

    printf("\n========== YOUR TASKS ==========\n");

    for (int i = 0; i < taskCount; i++) {
        printf("\nID: %d\n", tasks[i].id);
        printf("Name: %s\n", tasks[i].name);
        printf("Category: %s\n", tasks[i].category);

        printf("Status: %s\n",
               tasks[i].completed ? "Completed" : "Pending");

        printf("Tracked time: %ld hour(s), %ld minute(s), %ld second(s)\n",
               tasks[i].totalSeconds / 3600,
               (tasks[i].totalSeconds % 3600) / 60,
               tasks[i].totalSeconds % 60);
    }
}

/* Mark a task as complete */
void completeTask(void) {
    int id;

    printf("\nEnter task ID to complete: ");

    if (scanf("%d", &id) != 1) {
        printf("Please enter a valid numeric ID.\n");
        clearInputBuffer();
        return;
    }

    clearInputBuffer();

    int index = findTask(id);

    if (index == -1) {
        printf("Task not found.\n");
        return;
    }

    tasks[index].completed = 1;
    saveTasks();

    printf("Task marked as completed.\n");
}

/* Start the timer */
void startTimer(void) {
    int id;

    if (activeTaskId != -1) {
        printf("\nA timer is already running for task ID %d.\n",
               activeTaskId);
        printf("Stop it using option 5 before starting another timer.\n");
        return;
    }

    if (taskCount == 0) {
        printf("\nNo tasks available. Add a task first.\n");
        return;
    }

    viewTasks();

    printf("\nEnter task ID to start the timer: ");

    if (scanf("%d", &id) != 1) {
        printf("Please enter a valid numeric ID.\n");
        clearInputBuffer();
        return;
    }

    clearInputBuffer();

    int index = findTask(id);

    if (index == -1) {
        printf("Task not found. Please check the task ID.\n");
        return;
    }

    if (tasks[index].completed) {
        printf("This task is already completed.\n");
        return;
    }

    activeTaskId = id;
    startTime = time(NULL);

    printf("\nTimer started successfully for: %s\n",
           tasks[index].name);
    printf("Select option 5 when you want to stop the timer.\n");
}

/* Stop the timer and save elapsed time */
void stopTimer(void) {
    if (activeTaskId == -1) {
        printf("\nNo timer is running.\n");
        return;
    }

    time_t endTime = time(NULL);
    long elapsed = (long)difftime(endTime, startTime);

    int index = findTask(activeTaskId);

    if (index == -1) {
        printf("\nError: Active task was not found.\n");
        activeTaskId = -1;
        startTime = 0;
        return;
    }

    if (elapsed > 0) {
        tasks[index].totalSeconds += elapsed;
    }

    saveTasks();

    printf("\n========== TIMER STOPPED ==========\n");
    printf("Task: %s\n", tasks[index].name);

    printf("Session duration: %ld minute(s), %ld second(s)\n",
           elapsed / 60, elapsed % 60);

    printf("Total task time: %ld hour(s), %ld minute(s), %ld second(s)\n",
           tasks[index].totalSeconds / 3600,
           (tasks[index].totalSeconds % 3600) / 60,
           tasks[index].totalSeconds % 60);

    activeTaskId = -1;
    startTime = 0;
}

/* Display productivity statistics */
void showSummary(void) {
    long totalSeconds = 0;
    int completed = 0;

    for (int i = 0; i < taskCount; i++) {
        totalSeconds += tasks[i].totalSeconds;

        if (tasks[i].completed) {
            completed++;
        }
    }

    printf("\n========== PRODUCTIVITY SUMMARY ==========\n");
    printf("Total tasks: %d\n", taskCount);
    printf("Completed tasks: %d\n", completed);
    printf("Pending tasks: %d\n", taskCount - completed);

    printf("Total tracked time: %ld hour(s), %ld minute(s), %ld second(s)\n",
           totalSeconds / 3600,
           (totalSeconds % 3600) / 60,
           totalSeconds % 60);
}

/* Main menu */
int main(void) {
    int choice;

    loadTasks();

    printf("\nWelcome to the Time Tracking System!\n");

    do {
        printf("\n====================================\n");
        printf("       TIME TRACKING SYSTEM\n");
        printf("====================================\n");
        printf("1. Add Task\n");
        printf("2. View Tasks\n");
        printf("3. Complete Task\n");
        printf("4. Start Timer\n");
        printf("5. Stop Timer\n");
        printf("6. Productivity Summary\n");
        printf("0. Exit\n");

        printf("Enter your choice: ");
        fflush(stdout);

        if (scanf("%d", &choice) != 1) {
            printf("\nInvalid input. Enter a menu number.\n");
            clearInputBuffer();
            continue;
        }

        clearInputBuffer();

        switch (choice) {
            case 1:
                addTask();
                break;

            case 2:
                viewTasks();
                break;

            case 3:
                completeTask();
                break;

            case 4:
                startTimer();
                break;

            case 5:
                stopTimer();
                break;

            case 6:
                showSummary();
                break;

            case 0:
                if (activeTaskId != -1) {
                    printf("\nStopping the active timer before exit...\n");
                    stopTimer();
                }

                printf("\nThank you for using Time Tracking System!\n");
                break;

            default:
                printf("\nInvalid choice. Enter a number from 0 to 6.\n");
        }

    } while (choice != 0);

    return 0;
}
