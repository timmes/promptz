// components/Logout.tsx

"use client";

import {
  Form,
  SpaceBetween,
  Button,
  Container,
  FormField,
  Input,
  Textarea,
  Tiles,
  RadioGroup,
} from "@cloudscape-design/components";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { PromptGraphQLRepository } from "@/repositories/PromptRepository";
import { useAuth } from "@/contexts/AuthContext";
import {
  PromptCategory,
  PromptViewModel,
  SdlcPhase,
} from "@/models/PromptViewModel";
import validator from "validator";

interface PromptFormProps {
  prompt: PromptViewModel;
}

interface FormData {
  id: string;
  name: string;
  description: string;
  instruction: string;
  sdlcPhase: string;
  category: string;
}

interface FormErrors {
  name?: string;
  description?: string;
  instruction?: string;
  sdlcPhase?: string;
  category?: string;
}

const repository = new PromptGraphQLRepository();

export default function PromptForm(props: PromptFormProps) {
  const { user } = useAuth();
  const router = useRouter();

  const [formError, setFormError] = useState("");
  const [formErrors, setFormErrors] = useState<FormErrors>({});

  const [formData, setFormData] = useState<FormData>({
    id: props.prompt.id,
    name: props.prompt.name,
    description: props.prompt.description,
    instruction: props.prompt.instruction,
    sdlcPhase: props.prompt.sdlcPhase,
    category: props.prompt.category,
  } as FormData);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      setFormError("");

      // TODO: move this to PromptViewModel
      if (!validateForm()) {
        setFormError(
          "There are some validation issues with your input. Please check the form for for errors.",
        );
        return;
      }

      const editedPrompt = props.prompt.copy();
      editedPrompt.name = formData.name;
      editedPrompt.description = formData.description;
      editedPrompt.instruction = formData.instruction;
      editedPrompt.sdlcPhase = formData.sdlcPhase as SdlcPhase;
      editedPrompt.category = formData.category as PromptCategory;
      if (editedPrompt.id === "") {
        await repository.createPrompt(editedPrompt, user!);
      } else {
        await repository.updatePrompt(editedPrompt);
      }

      router.back();
    } catch (error) {
      console.error("Error creating/updating prompt:", error);
      setFormError(
        "An error occurred while saving the prompt. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  };

  const validateInput = (
    value: string,
    options: {
      field: keyof FormData;
      minLength?: number;
      maxLength?: number;
      required?: boolean;
    },
  ): { isValid: boolean; sanitized: string } => {
    const { field, minLength = 0, maxLength = 2000, required = true } = options;

    // Trim the input
    const sanitized = validator.trim(value);

    // Check if field is required
    if (required && validator.isEmpty(sanitized)) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: `${field} is required`,
      }));
      return { isValid: false, sanitized };
    }

    // Validate length
    if (!validator.isLength(sanitized, { min: minLength, max: maxLength })) {
      setFormErrors((prev) => ({
        ...prev,
        [field]: `${field} must be between ${minLength} and ${maxLength} characters`,
      }));
      return { isValid: false, sanitized };
    }

    // Clear error if validation passes
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    return { isValid: true, sanitized };
  };

  const validateForm = (): boolean => {
    const nameValidation = validateInput(formData.name, {
      field: "name",
      minLength: 3,
      maxLength: 100,
    });

    const descriptionValidation = validateInput(formData.description, {
      field: "description",
      minLength: 10,
      maxLength: 500,
    });

    const instructionValidation = validateInput(formData.instruction, {
      field: "instruction",
      minLength: 10,
      maxLength: 2000,
    });

    // Validate enum values
    const isValidSdlcPhase = Object.values(SdlcPhase).includes(
      formData.sdlcPhase as SdlcPhase,
    );
    const isValidCategory = Object.values(PromptCategory).includes(
      formData.category as PromptCategory,
    );

    if (!isValidSdlcPhase) {
      setFormErrors((prev) => ({
        ...prev,
        sdlcPhase: "Please select a valid SDLC phase",
      }));
    }

    if (!isValidCategory) {
      setFormErrors((prev) => ({
        ...prev,
        category: "Please select a valid category",
      }));
    }

    // Update form data with sanitized values
    setFormData((prev) => ({
      ...prev,
      name: nameValidation.sanitized,
      description: descriptionValidation.sanitized,
      instruction: instructionValidation.sanitized,
    }));

    return (
      nameValidation.isValid &&
      descriptionValidation.isValid &&
      instructionValidation.isValid &&
      isValidSdlcPhase &&
      isValidCategory
    );
  };

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        await handleSubmit();
      }}
    >
      <Form
        errorText={formError}
        actions={
          <SpaceBetween direction="horizontal" size="xs">
            <Button
              formAction="none"
              variant="link"
              onClick={() => router.back()}
              data-testid="button-cancel"
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              formAction="submit"
              loading={loading}
              data-testid="button-save"
            >
              Save prompt
            </Button>
          </SpaceBetween>
        }
      >
        <Container>
          <SpaceBetween direction="vertical" size="l">
            <FormField
              data-testid="formfield-name"
              stretch
              description="A catchy name for your prompt."
              label="Name"
              errorText={formErrors.name}
            >
              <Input
                data-testid="input-name"
                value={formData.name}
                onChange={({ detail }) =>
                  setFormData({ ...formData, name: detail.value })
                }
              />
            </FormField>
            <FormField
              data-testid="formfield-description"
              stretch
              description="What is this prompt doing? What is the goal?"
              label="Description"
              errorText={formErrors.description}
            >
              <Input
                data-testid="input-description"
                value={formData.description}
                onChange={({ detail }) =>
                  setFormData({ ...formData, description: detail.value })
                }
              />
            </FormField>
            <FormField
              data-testid="formfield-sdlc"
              label="Software Development Lifecycle (SDLC) Phase"
              description="Which phase of the SDLC does this prompt relate to?"
              stretch
              errorText={formErrors.sdlcPhase}
            >
              <Tiles
                onChange={({ detail }) =>
                  setFormData({ ...formData, sdlcPhase: detail.value })
                }
                value={formData.sdlcPhase}
                items={[
                  {
                    label: "Plan",
                    description:
                      "Define project scope, objectives, and feasibility while estimating resources and timelines.",
                    value: SdlcPhase.PLAN,
                  },
                  {
                    label: "Requirements Analysis",
                    description:
                      "Gather, analyze, and document detailed software requirements.",
                    value: SdlcPhase.REQ,
                  },
                  {
                    label: "Design",
                    description:
                      "Create the software architecture, user interface, and system design based on the requirements.",
                    value: SdlcPhase.DESIGN,
                  },
                  {
                    label: "Implement",
                    description:
                      "Write, refactor, fix and review the actual code for the software according to design specifications.",
                    value: SdlcPhase.IMPLEMENT,
                  },
                  {
                    label: "Test",
                    description:
                      "Conduct various types of testing to identify and fix bugs, ensuring the software meets quality standards and requirements.",
                    value: SdlcPhase.TEST,
                  },
                  {
                    label: "Deploy",
                    description:
                      "Release the software to the production environment, including installation, configuration, and user training.",
                    value: SdlcPhase.DEPLOY,
                  },
                  {
                    label: "Maintain",
                    description:
                      "Monitor, update, and support the software post-deployment, addressing issues and implementing new features as needed.",
                    value: SdlcPhase.MAINTAIN,
                  },
                ]}
              />
            </FormField>
            <FormField
              data-testid="formfield-category"
              label="Prompt Category"
              description="Is this prompt related to Amazon Q Developer Chat, Dev Agent, or inline code completion?"
              stretch
              errorText={formErrors.category}
            >
              <RadioGroup
                onChange={({ detail }) =>
                  setFormData({ ...formData, category: detail.value })
                }
                value={formData.category}
                items={[
                  { value: PromptCategory.CHAT, label: "Chat" },
                  { value: PromptCategory.DEV_AGENT, label: "Dev Agent" },
                  {
                    value: PromptCategory.INLINE,
                    label: "Inline Code Completion",
                  },
                ]}
              />
            </FormField>
            <FormField
              data-testid="formfield-instruction"
              label="Instruction"
              description="The specific task you want Amazon Q Developer to perform."
              stretch
              errorText={formErrors.instruction}
            >
              <Textarea
                data-testid="textarea-instruction"
                onChange={({ detail }) =>
                  setFormData({ ...formData, instruction: detail.value })
                }
                value={formData.instruction}
                ariaRequired
                placeholder=""
                spellcheck
                rows={10}
              />
            </FormField>
          </SpaceBetween>
        </Container>
      </Form>
    </form>
  );
}
