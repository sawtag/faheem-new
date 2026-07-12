import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

describe("Tabs", () => {
  it("moves selection with arrow-key navigation", async () => {
    render(
      <Tabs defaultValue="a">
        <TabsList>
          <TabsTrigger value="a">A</TabsTrigger>
          <TabsTrigger value="b">B</TabsTrigger>
          <TabsTrigger value="c">C</TabsTrigger>
        </TabsList>
        <TabsContent value="a">Panel A</TabsContent>
        <TabsContent value="b">Panel B</TabsContent>
        <TabsContent value="c">Panel C</TabsContent>
      </Tabs>,
    );

    screen.getByRole("tab", { name: "A" }).focus();
    await userEvent.keyboard("{ArrowRight}");

    expect(screen.getByRole("tab", { name: "B" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByText("Panel B")).toBeVisible();
  });
});
